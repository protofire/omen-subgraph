import { Category, Condition, Question } from "../../generated/schema";

export function assignQuestionToCondition(
  condition: Condition,
  questionId: string
): void {
  condition.question = questionId;
  let question = Question.load(questionId);
  if (question != null) {
    if (question.category != null) {
      let category = Category.load(question.category);
      if (category != null) {
        category.numConditions++;
        category.numOpenConditions++;
        category.save();
      }
    }
  }
}
