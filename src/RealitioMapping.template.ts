import { crypto, log, BigInt, Bytes, ByteArray } from '@graphprotocol/graph-ts'

import {
  LogNewQuestion,
  LogNewAnswer,
  LogNotifyOfArbitrationRequest,
  LogFinalize,
  LogAnswerReveal,
} from '../generated/Realitio/Realitio'
import { QuestionIdAnnouncement } from '../generated/RealitioScalarAdapter/RealitioScalarAdapter'
import { Question, FixedProductMarketMaker, Category, ScalarQuestionLink, Condition, Answer } from '../generated/schema'
import { assignQuestionToCondition } from './utils/condition'

import { unescape } from './utils/unescape'

export function handleNewQuestion(event: LogNewQuestion): void {
  let questionId = event.params.question_id.toHexString();
  let question = new Question(questionId);
  let templateId = event.params.template_id
  let templateIdI32 = templateId.toI32();
  if (templateIdI32 == 2) {
    question.templateId = templateId;

    let data = event.params.question;
    question.data = data;
  
    let fields = data.split('\u241f', 4);
  
    if (fields.length >= 1) {
      question.title = unescape(fields[0]);
      if (fields.length >= 2) {
        let outcomesData = fields[1];
        let start = -1;
        let escaped = false
        let outcomes = new Array<string>(0);
        for (let i = 0; i < outcomesData.length; i++) {
          if (escaped) {
            escaped = false;
          } else {
            if (outcomesData[i] == '"') {
              if (start == -1) {
                start = i + 1;
              } else {
                outcomes.push(unescape(outcomesData.slice(start, i)));
                start = -1;
              }
            } else if (outcomesData[i] == '\\') {
              escaped = true;
            }
          }
        }
        question.outcomes = outcomes;
        if (fields.length >= 3) {
          let categoryId = unescape(fields[2])
          question.category = categoryId;
          let category = Category.load(categoryId);
          if (category == null) {
            category = new Category(categoryId);
            category.numConditions = 0;
            category.numOpenConditions = 0;
            category.numClosedConditions = 0;
            category.save();
          }

          if (fields.length >= 4) {
            question.language = unescape(fields[3]);
          }
        }
      }
    }
  } else if (
    templateIdI32 == 0 ||
    templateIdI32 == 1 ||
    templateIdI32 == {{nuancedBinaryTemplateId}}
  ) {
    question.templateId = templateId;

    let data = event.params.question;
    question.data = data;
  
    let fields = data.split('\u241f', 4);
  
    if (fields.length >= 1) {
      question.title = unescape(fields[0]);
      if (fields.length >= 2) {
        question.category = unescape(fields[1]);
        if (fields.length >= 3) {
          question.language = unescape(fields[2]);
        }
      }
    }
  } else {
    log.info('ignoring question {} with template ID {}', [
      questionId,
      templateId.toString(),
    ]);
    return;
  }

  question.arbitrator = event.params.arbitrator;
  question.openingTimestamp = event.params.opening_ts;
  question.timeout = event.params.timeout;

  question.isPendingArbitration = false;
  question.arbitrationOccurred = false;

  question.indexedFixedProductMarketMakers = [];

  question.save();
}

export function handleScalarQuestionIdAnnouncement(event: QuestionIdAnnouncement): void {
  let realityEthQuestionId = event.params.realitioQuestionId;
  let conditionQuestionId = event.params.conditionQuestionId;
  let linkId = conditionQuestionId.toHexString();
  let link = ScalarQuestionLink.load(linkId);
  let scalarLow = event.params.low;
  let scalarHigh = event.params.high;

  if (link == null) {
    link = new ScalarQuestionLink(linkId);
    link.conditionQuestionId = conditionQuestionId;
    link.realityEthQuestionId = realityEthQuestionId;
    link.question = realityEthQuestionId.toHexString();
    link.scalarLow = scalarLow;
    link.scalarHigh = scalarHigh;
    link.save();
  } else {
    log.info("Scalar link {} already announced", [linkId]);
  }

  let conditionIdHashPreimage = new Uint8Array(20 + 32 + 32) as ByteArray;
  let oracleAddress = event.address;
  for (let i = 0; i < 20 && i < oracleAddress.length; i++) {
    conditionIdHashPreimage[i] = oracleAddress[i];
  }
  for (let i = 0; i < 32 && i < conditionQuestionId.length; i++) {
    conditionIdHashPreimage[20 + i] = conditionQuestionId[i];
  }
  conditionIdHashPreimage[20 + 32 + 32 - 1] = 2;
  let conditionId = crypto.keccak256(conditionIdHashPreimage).toHexString();
  let condition = Condition.load(conditionId);
  if (condition != null) {
    assignQuestionToCondition(condition as Condition, realityEthQuestionId.toHexString());
    condition.scalarLow = scalarLow;
    condition.scalarHigh = scalarHigh;
    condition.save();
  }
}

function saveNewAnswer(questionId: string, answer: Bytes, bond: BigInt, ts: BigInt): void {
  let question = Question.load(questionId);
  if (question == null) {
    log.info('cannot find question {} to answer', [questionId]);
    return;
  }

  let answerId = questionId + '_' + answer.toHexString();
  let answerEntity = Answer.load(answerId);
  if(answerEntity == null) {
    answerEntity = new Answer(answerId);
    answerEntity.question = questionId;
    answerEntity.answer = answer;
    answerEntity.bondAggregate = bond;
    answerEntity.timestamp = ts;
    answerEntity.save();
  } else {
    answerEntity.bondAggregate = answerEntity.bondAggregate.plus(bond);
    answerEntity.timestamp = ts;
    answerEntity.save();
  }

  let answerFinalizedTimestamp = question.arbitrationOccurred ? ts : ts.plus(question.timeout);

  question.currentAnswer = answer;
  question.currentAnswerBond = bond;
  question.currentAnswerTimestamp = ts;
  question.answerFinalizedTimestamp = answerFinalizedTimestamp;

  question.save();

  let fpmms = question.indexedFixedProductMarketMakers;
  for (let i = 0; i < fpmms.length; i++) {
    let fpmmId = fpmms[i];
    let fpmm = FixedProductMarketMaker.load(fpmmId);
    if (fpmm == null) {
      log.error('indexed fpmm {} not found for question {}', [fpmmId, questionId]);
      continue;
    }

    fpmm.currentAnswer = answer;
    fpmm.currentAnswerBond = bond;
    fpmm.currentAnswerTimestamp = ts;
    fpmm.answerFinalizedTimestamp = answerFinalizedTimestamp;

    fpmm.save();
  }
}

export function handleNewAnswer(event: LogNewAnswer): void {
  if (event.params.is_commitment) {
    // only record confirmed answers
    return;
  }

  let questionId = event.params.question_id.toHexString();
  saveNewAnswer(questionId, event.params.answer, event.params.bond, event.params.ts);
}

export function handleAnswerReveal(event: LogAnswerReveal): void {
  let questionId = event.params.question_id.toHexString();
  saveNewAnswer(questionId, event.params.answer, event.params.bond, event.block.timestamp);
}

export function handleArbitrationRequest(event: LogNotifyOfArbitrationRequest): void {
  let questionId = event.params.question_id.toHexString()
  let question = Question.load(questionId);
  if (question == null) {
    log.info('cannot find question {} to begin arbitration', [questionId]);
    return;
  }

  question.isPendingArbitration = true;
  question.answerFinalizedTimestamp = null;

  question.save();

  let fpmms = question.indexedFixedProductMarketMakers;
  for (let i = 0; i < fpmms.length; i++) {
    let fpmmId = fpmms[i];
    let fpmm = FixedProductMarketMaker.load(fpmmId);
    if (fpmm == null) {
      log.error('indexed fpmm {} not found for question {}', [fpmmId, questionId]);
      continue;
    }

    fpmm.isPendingArbitration = true;
    fpmm.answerFinalizedTimestamp = null;

    fpmm.save();
  }
}

export function handleFinalize(event: LogFinalize): void {
  let questionId = event.params.question_id.toHexString()
  let question = Question.load(questionId);
  if (question == null) {
    log.info('cannot find question {} to finalize', [questionId]);
    return;
  }

  question.isPendingArbitration = false;
  question.arbitrationOccurred = true;

  question.save();

  let fpmms = question.indexedFixedProductMarketMakers;
  for (let i = 0; i < fpmms.length; i++) {
    let fpmmId = fpmms[i];
    let fpmm = FixedProductMarketMaker.load(fpmmId);
    if (fpmm == null) {
      log.error('indexed fpmm {} not found for question {}', [fpmmId, questionId]);
      continue;
    }

    fpmm.isPendingArbitration = false;
    fpmm.arbitrationOccurred = true;

    fpmm.save();
  }
}
