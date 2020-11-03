import { BigInt, Address } from "@graphprotocol/graph-ts";

import {
  GelatoCore,
  LogTaskSubmitted,
  LogTaskSubmittedTaskReceiptTasksActionsStruct,
  LogTaskSubmittedTaskReceiptTasksConditionsStruct,
} from "../generated/GelatoCore/GelatoCore";

import {
  User,
  TaskReceiptWrapper,
  TaskReceipt,
  Task,
  Provider,
  TaskCondition,
  Action,
  TaskCycle
} from "../generated/schema";

function getAction(
  actionId: string,
  eventAction: LogTaskSubmittedTaskReceiptTasksActionsStruct
): Action | null {
  let action = new Action(actionId);

  action.addr = eventAction.addr;
  action.data = eventAction.data;
  action.dataFlow = BigInt.fromI32(eventAction.dataFlow);
  action.operation = BigInt.fromI32(eventAction.operation);
  action.termsOkCheck = eventAction.termsOkCheck;
  action.value = eventAction.value;

  action.save();

  return action;
}

function getCondition(
  conditionId: string,
  eventCondition: LogTaskSubmittedTaskReceiptTasksConditionsStruct
): TaskCondition | null {
  let condition = new TaskCondition(conditionId.toString());

  condition.inst = eventCondition.inst;
  condition.data = eventCondition.data;

  condition.save();

  return condition;
}

// Task Submitted
export function handleLogTaskSubmitted(event: LogTaskSubmitted): void {
  // setting Id of taskreceipt
  let user = User.load(event.params.taskReceipt.userProxy.toHex());
  if (user == null) {
    user = new User(event.params.taskReceipt.userProxy.toHex());
    user.address = event.params.taskReceipt.userProxy;
    user.signUpDate = event.block.timestamp;
    user.save();
  }

  let taskReceiptId = event.params.taskReceiptId.toString();
  let taskReceipt = new TaskReceipt(taskReceiptId);
  taskReceipt.userProxy = user.address;
  // New Provider
  let provider = Provider.load(event.params.taskReceipt.provider.addr.toHex());
  if (provider == null) {
    provider = new Provider(event.params.taskReceipt.provider.addr.toHex());
    // Entity fields can be set using simple assignments
    provider.taskCount = BigInt.fromI32(0);
  }
  provider.addr = event.params.taskReceipt.provider.addr;
  provider.module = event.params.taskReceipt.provider.module;
  provider.taskCount = provider.taskCount.plus(BigInt.fromI32(1));
  provider.save();
  taskReceipt.provider = provider.id;
  // Index
  taskReceipt.index = event.params.taskReceipt.index;
  // Iterate over all tasks
  let taskArray = new Array<string>();
  let eventTaskArray = event.params.taskReceipt.tasks;
  let tasksNum = eventTaskArray.length;
  for (let i = 0; i < tasksNum; ++i) {
    let taskId = taskReceiptId.toString() + "." + i.toString();
    let task = new Task(taskId);
    if (eventTaskArray[i] != null) {
      let eventTask = eventTaskArray[i];

      // Fetch the Actions
      let actions = eventTask.actions;
      let actionsLength = eventTask.actions.length;
      let actionArray = new Array<string>();

      for (let j = 0; j < actionsLength; ++j) {
        if (actions[j] != null) {
          let eventAction = actions[j];
          let action = getAction(
            taskId + "." + j.toString(),
            eventAction
          ) as Action;
          actionArray.push(action.id);
        }
      }
      task.actions = actionArray;

      // Fetch Conditions
      let conditions = eventTask.conditions;
      let conditionLength = eventTask.conditions.length;
      let conditionArray = new Array<string>();

      for (let j = 0; j < conditionLength; ++j) {
        if (conditions[j] != null) {
          let eventCondition = conditions[j];
          let condition = getCondition(
            taskId + "." + j.toString(),
            eventCondition
          ) as TaskCondition;
          conditionArray.push(condition.id);
        }
      }

      task.conditions = conditionArray;

      // Add selfProviderGasLimit && selfProviderGasPriceCeil
      task.selfProviderGasLimit = eventTask.selfProviderGasLimit;
      task.selfProviderGasPriceCeil = eventTask.selfProviderGasPriceCeil;

      task.save();
      taskArray.push(task.id);
    }
  }

  // Add tasks to TaskReceipt
  taskReceipt.tasks = taskArray;

  // Add the remaining fields
  taskReceipt.expiryDate = event.params.taskReceipt.expiryDate;
  taskReceipt.cycleId = event.params.taskReceipt.cycleId;
  taskReceipt.submissionsLeft = event.params.taskReceipt.submissionsLeft;
  taskReceipt.save();

  // // ==== Create TaskReceiptWrapper === \\
  let taskReceiptWrapper = new TaskReceiptWrapper(
    event.params.taskReceiptId.toString()
  );
  taskReceiptWrapper.user = user.id;
  taskReceiptWrapper.taskReceipt = taskReceipt.id;
  taskReceiptWrapper.taskReceipt = taskReceipt.id;
  taskReceiptWrapper.submissionHash = event.transaction.hash;
  taskReceiptWrapper.status = "awaitingExec";
  taskReceiptWrapper.submissionDate = event.block.timestamp;

  // Assigned Executor
  let gelatoCore = GelatoCore.bind(event.address);
  let executor = gelatoCore.executorByProvider(
    Address.fromString(provider.addr.toHexString())
  );
  taskReceiptWrapper.selectedExecutor = executor;

  taskReceiptWrapper.selfProvided =
    provider.addr == user.address ? true : false;

  taskReceiptWrapper.save();

  // Add taskReceipt to Task Cycle
  let taskCycle = TaskCycle.load(taskReceipt.cycleId.toString());
  if (taskCycle == null) {
    taskCycle = new TaskCycle(taskReceipt.cycleId.toString());
    taskCycle.taskReceiptWrappers = [];
  }

  let taskCycleReceiptIds = taskCycle.taskReceiptWrappers;
  taskCycleReceiptIds.push(taskReceiptWrapper.id);
  taskCycle.taskReceiptWrappers = taskCycleReceiptIds;
  taskCycle.save();
}
