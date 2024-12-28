import React from "react";
import "./section.css";
import { getDatabase, ref, query, get } from "firebase/database";
import { UserProfile } from "../types/Users";
import { app } from "../firebase";
import { Task, TaskIteration } from "../types/Tasks";

const fetchUsers = async () => {
  const db = getDatabase(app);
  const userRef = query(ref(db, `users`));
  let userList: UserProfile[] = [];
  const userSnapshot = await get(userRef);
  if (userSnapshot) {
    for (let userKey of Object.keys(userSnapshot.val())) {
      for (let userInnerKey of Object.keys(userSnapshot.val()[userKey])) {
        if (userSnapshot.val()[userKey][userInnerKey].session > 2) {
          userList.push(userSnapshot.val()[userKey][userInnerKey]);
        }
      }
    }
    return userList;
  }
};

const fetchKeyUpDownTimes = (
  taskData: Task[],
  sessionNumber: number,
  taskCharacters: number
) => {
  const upDownTimes: number[] = [];

  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );

  // just a measure to exclude arrays that have a very small amount of keystrokes due to inconsistencies
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; taskCharacters === 100 ? i < 2 : i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    // keyUp and KeyDown arrays for each iteration

    const keyDownArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keydown")
      .filter(
        (keystroke) =>
          keystroke.globalTimeStamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) =>
          keystroke1.globalTimeStamp - keystroke2.globalTimeStamp
      );
    const keyUpArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keyup")
      .filter(
        (keystroke) =>
          keystroke.timestamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) => keystroke1.timestamp - keystroke2.timestamp
      );

    const arrayLengthSession = Math.min(keyDownArray.length, keyUpArray.length);

    for (let keystroke = 0; keystroke < arrayLengthSession; keystroke++) {
      try {
        if (
          keyUpArray[keystroke].timestamp >
            keyDownArray[keystroke].globalTimeStamp &&
          keyUpArray[keystroke].code === keyDownArray[keystroke].code &&
          keyUpArray[keystroke + 1].code === keyDownArray[keystroke + 1].code
        ) {
          upDownTimes.push(
            keyDownArray[keystroke + 1].globalTimeStamp -
              keyUpArray[keystroke].timestamp
          );
        }
      } catch (e) {
        // correct later
        break;
      }
    }
  }

  // removing outliers with z-score method
  const meanUpDown =
    upDownTimes.reduce((acc, val) => acc + val, 0) / upDownTimes.length;
  const stDevMeanUpDown = Math.sqrt(
    upDownTimes
      .map((x) => Math.pow(x - meanUpDown, 2))
      .reduce((a, b) => a + b) / upDownTimes.length
  );
  const filteredUpDownTimes = upDownTimes
    .filter((value) => {
      const zScore = (value - meanUpDown) / stDevMeanUpDown;
      return Math.abs(zScore) <= 3;
    })
    .slice(0, taskCharacters * 10);

  if (filteredUpDownTimes.length < taskCharacters * 10) {
    const sorted = filteredUpDownTimes.slice().sort(function (a, b) {
      return a - b;
    });

    const mean = sorted[Math.floor(filteredUpDownTimes.length / 2)];

    const remainder = Array(
      taskCharacters * 10 - filteredUpDownTimes.length
    ).fill(mean);

    filteredUpDownTimes.push(...remainder);
  }

  console.log(filteredUpDownTimes);

  return filteredUpDownTimes;
};

const fetchKeyDownUpTimes = (
  taskData: Task[],
  sessionNumber: number,
  taskCharacters: number
) => {
  const downUpTimes: number[] = [];
  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );

  // just a measure to exclude arrays that have a very small amount of keystrokes due to inconsistencies
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; taskCharacters === 100 ? i < 1 : i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    // keyUp and KeyDown arrays for each iteration

    const keyDownArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keydown")
      .filter(
        (keystroke) =>
          keystroke.globalTimeStamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) =>
          keystroke1.globalTimeStamp - keystroke2.globalTimeStamp
      );
    const keyUpArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keyup")
      .filter(
        (keystroke) =>
          keystroke.timestamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) => keystroke1.timestamp - keystroke2.timestamp
      );

    const arrayLengthSession = Math.min(keyDownArray.length, keyUpArray.length);

    for (let keystroke = 0; keystroke < arrayLengthSession; keystroke++) {
      try {
        if (
          keyUpArray[keystroke].timestamp >
            keyDownArray[keystroke].globalTimeStamp &&
          keyUpArray[keystroke].code === keyDownArray[keystroke].code &&
          keyUpArray[keystroke + 1].code === keyDownArray[keystroke + 1].code
        ) {
          downUpTimes.push(
            keyUpArray[keystroke].timestamp -
              keyDownArray[keystroke].globalTimeStamp
          );
        }
      } catch (e) {
        // correct later
        break;
      }
    }
  }

  // removing outliers with z-score method

  const meanDownUp =
    downUpTimes.reduce((acc, val) => acc + val, 0) / downUpTimes.length;
  const stDevMeanDownUp = Math.sqrt(
    downUpTimes
      .map((x) => Math.pow(x - meanDownUp, 2))
      .reduce((a, b) => a + b) / downUpTimes.length
  );
  const filteredDownUpTimes = downUpTimes
    .filter((value) => {
      const zScore = (value - meanDownUp) / stDevMeanDownUp;
      return Math.abs(zScore) <= 2;
    })
    .slice(0, taskCharacters * 10);

  if (filteredDownUpTimes.length < taskCharacters * 10) {
    const sorted = filteredDownUpTimes.slice().sort(function (a, b) {
      return a - b;
    });

    const mean = sorted[Math.floor(filteredDownUpTimes.length / 2)];

    const remainder = Array(
      taskCharacters * 10 - filteredDownUpTimes.length
    ).fill(mean);

    filteredDownUpTimes.push(...remainder);
  }

  console.log(filteredDownUpTimes);

  return filteredDownUpTimes;
};

const fetchUpUpTimes = (
  taskData: Task[],
  sessionNumber: number,
  taskCharacters: number
) => {
  const upUpTimes: number[] = [];
  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );

  // just a measure to exclude arrays that have a very small amount of keystrokes due to inconsistencies
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; taskCharacters === 100 ? i < 1 : i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    const keyUpArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keyup")
      .filter(
        (keystroke) =>
          keystroke.timestamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) => keystroke1.timestamp - keystroke2.timestamp
      );

    for (let keystroke = 0; keystroke < keyUpArray.length - 1; keystroke++) {
      try {
        upUpTimes.push(
          keyUpArray[keystroke + 1].timestamp - keyUpArray[keystroke].timestamp
        );
      } catch (e) {
        // correct later
        break;
      }
    }
  }

  // removing outliers with z-score method

  const meanUpUp =
    upUpTimes.reduce((acc, val) => acc + val, 0) / upUpTimes.length;
  const stDevMeanUpUp = Math.sqrt(
    upUpTimes.map((x) => Math.pow(x - meanUpUp, 2)).reduce((a, b) => a + b) /
      upUpTimes.length
  );
  const filteredUpUpTimes = upUpTimes
    .filter((value) => {
      const zScore = (value - meanUpUp) / stDevMeanUpUp;
      return Math.abs(zScore) <= 2;
    })
    .slice(0, taskCharacters * 10);

  // shortening to fixed length:

  if (filteredUpUpTimes.length < taskCharacters * 10) {
    const sorted = filteredUpUpTimes.slice().sort(function (a, b) {
      return a - b;
    });

    const mean = sorted[Math.floor(filteredUpUpTimes.length / 2)];

    const remainder = Array(
      taskCharacters * 10 - filteredUpUpTimes.length
    ).fill(mean);

    filteredUpUpTimes.push(...remainder);
  }

  console.log(filteredUpUpTimes);

  return filteredUpUpTimes;
};

const fetchDownDownTimes = (
  taskData: Task[],
  sessionNumber: number,
  taskCharacters: number
) => {
  const downDownTimes: number[] = [];
  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );

  // just a measure to exclude arrays that have a very small amount of keystrokes due to inconsistencies
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; taskCharacters === 100 ? i < 1 : i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    const keyDownArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keydown")
      .filter(
        (keystroke) =>
          keystroke.globalTimeStamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) =>
          keystroke1.globalTimeStamp - keystroke2.globalTimeStamp
      );

    for (let keystroke = 0; keystroke < keyDownArray.length - 1; keystroke++) {
      try {
        downDownTimes.push(
          keyDownArray[keystroke + 1].timestamp -
            keyDownArray[keystroke].timestamp
        );
      } catch (e) {
        // correct later
        break;
      }
    }
  }

  // removing outliers with z-score method

  const meanDownDown =
    downDownTimes.reduce((acc, val) => acc + val, 0) / downDownTimes.length;
  const stDevMeanDownDown = Math.sqrt(
    downDownTimes
      .map((x) => Math.pow(x - meanDownDown, 2))
      .reduce((a, b) => a + b) / downDownTimes.length
  );
  const filteredDownDownTimes = downDownTimes
    .filter((value) => {
      const zScore = (value - meanDownDown) / stDevMeanDownDown;
      return Math.abs(zScore) <= 2;
    })
    .slice(0, taskCharacters * 10);

  // shortening to fixed length:

  if (filteredDownDownTimes.length < taskCharacters * 10) {
    const sorted = filteredDownDownTimes.slice().sort(function (a, b) {
      return a - b;
    });

    const mean = sorted[Math.floor(filteredDownDownTimes.length / 2)];

    const remainder = Array(
      taskCharacters * 10 - filteredDownDownTimes.length
    ).fill(mean);

    filteredDownDownTimes.push(...remainder);
  }

  console.log(filteredDownDownTimes);

  return filteredDownDownTimes;
};

const fetchDigraphTimes = (
  taskData: Task[],
  sessionNumber: number,
  taskCharacters: number
) => {
  const downUpTimes: number[] = [];
  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );

  // just a measure to exclude arrays that have a very small amount of keystrokes due to inconsistencies
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; taskCharacters === 100 ? i < 1 : i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    // keyUp and KeyDown arrays for each iteration

    const keyDownArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keydown")
      .filter(
        (keystroke) =>
          keystroke.globalTimeStamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) =>
          keystroke1.globalTimeStamp - keystroke2.globalTimeStamp
      );
    const keyUpArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keyup")
      .filter(
        (keystroke) =>
          keystroke.timestamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) => keystroke1.timestamp - keystroke2.timestamp
      );

    const arrayLengthSession = Math.min(keyDownArray.length, keyUpArray.length);

    for (let keystroke = 0; keystroke < arrayLengthSession - 1; keystroke++) {
      try {
        if (
          keyUpArray[keystroke].timestamp >
            keyDownArray[keystroke].globalTimeStamp &&
          keyUpArray[keystroke].code === keyDownArray[keystroke].code &&
          keyUpArray[keystroke + 1].code === keyDownArray[keystroke + 1].code
        ) {
          downUpTimes.push(
            keyUpArray[keystroke + 1].timestamp -
              keyDownArray[keystroke].globalTimeStamp
          );
        }
      } catch (e) {
        // correct later
        break;
      }
    }
  }

  // removing outliers with z-score method

  const meanDownUp =
    downUpTimes.reduce((acc, val) => acc + val, 0) / downUpTimes.length;
  const stDevMeanDownUp = Math.sqrt(
    downUpTimes
      .map((x) => Math.pow(x - meanDownUp, 2))
      .reduce((a, b) => a + b) / downUpTimes.length
  );
  const filteredDownUpTimes = downUpTimes
    .filter((value) => {
      const zScore = (value - meanDownUp) / stDevMeanDownUp;
      return Math.abs(zScore) <= 2;
    })
    .slice(0, taskCharacters * 10);

  // shortening to fixed length:

  if (filteredDownUpTimes.length < taskCharacters * 10) {
    const sorted = filteredDownUpTimes.slice().sort(function (a, b) {
      return a - b;
    });

    const mean = sorted[Math.floor(filteredDownUpTimes.length / 2)];

    const remainder = Array(
      taskCharacters * 10 - filteredDownUpTimes.length
    ).fill(mean);

    filteredDownUpTimes.push(...remainder);
  }

  console.log(filteredDownUpTimes);

  return filteredDownUpTimes;
};

const fetchTrigraphTimes = (
  taskData: Task[],
  sessionNumber: number,
  taskCharacters: number
) => {
  const downUpTimes: number[] = [];
  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );

  // just a measure to exclude arrays that have a very small amount of keystrokes due to inconsistencies
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; taskCharacters === 100 ? i < 1 : i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    // keyUp and KeyDown arrays for each iteration

    const keyDownArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keydown")
      .filter(
        (keystroke) =>
          keystroke.globalTimeStamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) =>
          keystroke1.globalTimeStamp - keystroke2.globalTimeStamp
      );
    const keyUpArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keyup")
      .filter(
        (keystroke) =>
          keystroke.timestamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .filter(
        (keystroke) =>
          !keystroke.altKey ||
          !keystroke.metaKey ||
          !keystroke.ctrlKey ||
          !keystroke.shiftKey
      )
      .filter((keystroke) => keystroke.key !== "Shift")
      .filter((keystroke) => keystroke.key !== "CapsLock")
      .filter((keystroke) => keystroke.key !== "Control")
      .sort(
        (keystroke1, keystroke2) => keystroke1.timestamp - keystroke2.timestamp
      );

    const arrayLengthSession = Math.min(keyDownArray.length, keyUpArray.length);

    for (let keystroke = 0; keystroke < arrayLengthSession - 2; keystroke++) {
      try {
        if (
          keyUpArray[keystroke].timestamp >
            keyDownArray[keystroke].globalTimeStamp &&
          keyUpArray[keystroke].code === keyDownArray[keystroke].code &&
          keyUpArray[keystroke + 1].code === keyDownArray[keystroke + 1].code &&
          keyUpArray[keystroke + 2].code === keyDownArray[keystroke + 2].code
        ) {
          downUpTimes.push(
            keyUpArray[keystroke + 2].timestamp -
              keyDownArray[keystroke].globalTimeStamp
          );
        }
      } catch (e) {
        // correct later
        break;
      }
    }
  }

  // removing outliers with z-score method

  const meanDownUp =
    downUpTimes.reduce((acc, val) => acc + val, 0) / downUpTimes.length;
  const stDevMeanDownUp = Math.sqrt(
    downUpTimes
      .map((x) => Math.pow(x - meanDownUp, 2))
      .reduce((a, b) => a + b) / downUpTimes.length
  );
  const filteredDownUpTimes = downUpTimes
    .filter((value) => {
      const zScore = (value - meanDownUp) / stDevMeanDownUp;
      return Math.abs(zScore) <= 2;
    })
    .slice(0, taskCharacters * 10);

  // shortening to fixed length:

  if (filteredDownUpTimes.length < taskCharacters * 10) {
    const sorted = filteredDownUpTimes.slice().sort(function (a, b) {
      return a - b;
    });

    const mean = sorted[Math.floor(filteredDownUpTimes.length / 2)];

    const remainder = Array(
      taskCharacters * 10 - filteredDownUpTimes.length
    ).fill(mean);

    filteredDownUpTimes.push(...remainder);
  }

  console.log(filteredDownUpTimes);

  return filteredDownUpTimes;
};

const fetchTypingSpeedData = (taskData: Task[], sessionNumber: number) => {
  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );
  const typingSpeedArray: number[] = [];
  for (let i = 0; i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);
    const keyDownArray = iterationValue.keystroke_list.filter(
      (keystroke) => keystroke.type === "keydown"
    );
    const totalWords = keyDownArray.length / 5;
    const minutes =
      (keyDownArray[keyDownArray.length - 1].globalTimeStamp -
        keyDownArray[0].globalTimeStamp) /
      60000;

    typingSpeedArray[i] = totalWords / minutes;
  }
  return typingSpeedArray;
};

const fetchAccuracy = (taskData: Task[], sessionNumber: number) => {
  const accuracyArray: number[] = [];
  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );
  for (let i = 0; i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);
    const keyDownArray = iterationValue.keystroke_list.filter(
      (keystroke) => keystroke.type === "keydown"
    );
    let backspaceCount = 0;

    for (let keystroke = 0; keystroke < keyDownArray.length; keystroke++) {
      try {
        if (keyDownArray[keystroke].key === "Backspace") {
          backspaceCount++;
        }
      } catch (e) {
        // correct later
        break;
      }
    }
    accuracyArray[i] =
      (keyDownArray.length - 2 * backspaceCount) / keyDownArray.length;
  }
  return accuracyArray;
};

// task non-specific (but not for task 2a) shift-left, shift right, caps lock counter (caps lock used? yes or no)
const fetchKeyPreferenceData = (taskData: Task[], sessionNumber: number) => {
  let shiftLeftRatioArray: number[] = [];
  let shiftRightRatioArray: number[] = [];
  let altLeftRatioArray: number[] = [];
  let altRightRatioArray: number[] = [];
  let capsLockCountArray: number[] = [];

  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    const keyDownArray = iterationValue.keystroke_list.filter(
      (keystroke) => keystroke.type === "keydown"
    );
    let shiftLeftCount = 0;
    let shiftRightCount = 0;
    let capsLockCount = 0;
    let shiftCount = 0;
    let altLeftCount = 0;
    let altRightCount = 0;
    let altCount = 0;
    for (let keystroke = 0; keystroke < keyDownArray.length; keystroke++) {
      try {
        if (keyDownArray[keystroke].key === "Shift") {
          shiftCount++;
          if (keyDownArray[keystroke].location === 1) {
            shiftLeftCount++;
          }
          if (keyDownArray[keystroke].location === 2) {
            shiftRightCount++;
          }
        }
        if (keyDownArray[keystroke].key === "Alt") {
          altCount++;
          if (keyDownArray[keystroke].location === 1) {
            altLeftCount++;
          }
          if (keyDownArray[keystroke].location === 2) {
            altRightCount++;
          }
        }
        if (keyDownArray[keystroke].key === "CapsLock") {
          capsLockCount++;
        }
      } catch (e) {
        // correct later
        break;
      }
    }
    try {
      shiftLeftRatioArray[i] = shiftCount > 0 ? shiftLeftCount / shiftCount : 0;
      shiftRightRatioArray[i] =
        shiftCount > 0 ? shiftRightCount / shiftCount : 0;
      altLeftRatioArray[i] = altCount > 0 ? altLeftCount / altCount : 0;
      altRightRatioArray[i] = altCount > 0 ? altRightCount / altCount : 0;
      capsLockCountArray[i] = capsLockCount;
    } catch (e) {
      break;
    }
  }
  // not enough alt data
  return shiftLeftRatioArray
    .concat(shiftRightRatioArray)
    .concat(capsLockCountArray);
  // .concat(altLeftRatioArray)
  // .concat(altRightRatioArray);
};

// task non-specific creation time fetch
const fetchTaskReactionTimeData = (taskData: Task[], sessionNumber: number) => {
  const reactionTimeArray: number[] = [];

  const iterationValues: TaskIteration[] = Object.values(
    taskData[`session-${sessionNumber}`]
  );
  const filteredIterations = iterationValues.filter(
    (value) => value.keystroke_list.length > 10
  );

  for (let i = 0; i < 10; i++) {
    //@ts-ignore
    const iterationValue: TaskIteration = filteredIterations.at(i);

    const keyDownArray = iterationValue.keystroke_list
      .filter((keystroke) => keystroke.type === "keydown")
      .filter(
        (keystroke) =>
          keystroke.globalTimeStamp >
          iterationValue.start_time + iterationValue.reaction_latency
      )
      .sort(
        (keystroke1, keystroke2) =>
          keystroke1.globalTimeStamp - keystroke2.globalTimeStamp
      );

    reactionTimeArray[i] =
      keyDownArray[0].globalTimeStamp -
      iterationValue.start_time -
      iterationValue.reaction_latency;
  }

  //   const meanDownUp =
  //   downUpTimes.reduce((acc, val) => acc + val, 0) / downUpTimes.length;
  // const stDevMeanDownUp = Math.sqrt(
  //   downUpTimes
  //     .map((x) => Math.pow(x - meanDownUp, 2))
  //     .reduce((a, b) => a + b) / downUpTimes.length
  // );
  // const filteredDownUpTimes = downUpTimes.filter((value) => {
  //   const zScore = (value - meanDownUp) / stDevMeanDownUp;
  //   return Math.abs(zScore) <= 2;
  // });

  const meanReactionTime =
    reactionTimeArray.reduce((acc, val) => acc + val, 0) /
    reactionTimeArray.length;
  const stDevReactionTime = Math.sqrt(
    reactionTimeArray
      .map((x) => Math.pow(x - meanReactionTime, 2))
      .reduce((a, b) => a + b) / reactionTimeArray.length
  );
  const filteredReactionTimeArray = reactionTimeArray.filter((value) => {
    const zScore = (value - meanReactionTime) / stDevReactionTime;
    return Math.abs(zScore) <= 0.5;
  });

  return filteredReactionTimeArray;
};

interface getCSVLabelProps {
  upDown?: boolean;
  downUp?: boolean;
  downDown?: boolean;
  upUp?: boolean;
  digraph?: boolean;
  trigraph?: boolean;
  reaction?: boolean;
  keyPreference?: boolean;
  accuracy?: boolean;
  typingSpeed?: boolean;
}
const getCSVLabel = async ({
  upDown,
  downUp,
  upUp,
  downDown,
  digraph,
  trigraph,
  reaction,
  keyPreference,
  accuracy,
  typingSpeed,
}: getCSVLabelProps) => {
  let label: string[] = [];
  label.push("user");
  label.push("session");

  if (upDown) {
    for (var i1 = 0; i1 < (10 + 43 + 40 + 41) * 10; i1++) {
      label.push(`up_down_${i1}`);
    }
  }

  if (downUp) {
    for (var i2 = 0; i2 < (10 + 43 + 40 + 41) * 10; i2++) {
      label.push(`down_up_${i2}`);
    }
  }

  if (upUp) {
    // change number
    for (var i3 = 0; i3 < (9 + 42 + 39 + 49) * 10; i3++) {
      label.push(`up_up_${i3}`);
    }
  }

  if (downDown) {
    // change number
    for (var i4 = 0; i4 < (9 + 42 + 39 + 49) * 10; i4++) {
      label.push(`down_down_${i4}`);
    }
  }

  if (trigraph) {
    // change number
    for (var i5 = 0; i5 < (8 + 41 + 38 + 48) * 10; i5++) {
      label.push(`down_down_${i5}`);
    }
  }

  // update to reflect accurate numbers
  if (reaction) {
    for (var i6 = 0; i6 < 30; i6++) {
      label.push(`reaction_${i6}`);
    }
  }

  if (keyPreference) {
    for (var i7 = 0; i7 < 30; i7++) {
      label.push(`key_preference_${i7}`);
    }
  }

  if (accuracy) {
    for (var i8 = 0; i8 < 30; i8++) {
      label.push(`accuracy_${i8}`);
    }
  }

  if (typingSpeed) {
    for (var i9 = 0; i9 < 30; i9++) {
      label.push(`typing_speed_${i9}`);
    }
  }

  if (digraph) {
    // change number
    for (var i10 = 0; i10 < (9 + 42 + 39 + 49) * 10; i10++) {
      label.push(`down_down_${i10}`);
    }
  }

  return label;
};

interface fetchTaskProps {
  upDown?: boolean;
  downUp?: boolean;
  upUp?: boolean;
  downDown?: boolean;
  digraph?: boolean;
  trigraph?: boolean;
  reaction?: boolean;
  keyPreference?: boolean;
  accuracy?: boolean;
  typingSpeed?: boolean;
}

const fetchTaskVectors = async ({
  upDown,
  downUp,
  upUp,
  downDown,
  digraph,
  trigraph,
  reaction,
  keyPreference,
  accuracy,
  typingSpeed,
}: fetchTaskProps) => {
  const db = getDatabase(app);
  let allVectors: any[] = [];
  const label = await getCSVLabel({
    upDown,
    downUp,
    upUp,
    downDown,
    digraph,
    trigraph,
    reaction,
    keyPreference,
    accuracy,
    typingSpeed,
  });
  allVectors.push(label);
  const userList = await fetchUsers();
  if (userList) {
    for (const user of userList) {
      const task1ref = query(ref(db, `task1/user-${user.user_id}`));
      const task2aref = query(ref(db, `task2a/user-${user.user_id}`));
      const task2bref = query(ref(db, `task2b/user-${user.user_id}`));
      const task2cref = query(ref(db, `task2c/user-${user.user_id}`));
      const task3ref = query(ref(db, `task3/user-${user.user_id}`));

      const task1Snapshot = await get(task1ref);
      const task2aSnapshot = await get(task2aref);
      const task2bSnapshot = await get(task2bref);
      const task2cSnapshot = await get(task2cref);
      const task3Snapshot = await get(task3ref);

      if (task1Snapshot && task2aSnapshot && task2bSnapshot && task2cSnapshot) {
        const task1Data: Task[] = task1Snapshot.val();
        const task2aData: Task[] = task2aSnapshot.val();
        const task2bData: Task[] = task2bSnapshot.val();
        const task2cData: Task[] = task2cSnapshot.val();
        const task3Data: Task[] = task3Snapshot.val();

        for (let i = 0; i < 3; i++) {
          let task1vector: any[] = [];
          let task2avector: any[] = [];
          let task2bvector: any[] = [];
          let task2cvector: any[] = [];
          let task3vector: any[] = [];

          if (upDown) {
            const temporalData1 = fetchKeyUpDownTimes(task1Data, i, 10);
            const temporalData2a = fetchKeyUpDownTimes(task2aData, i, 43);
            const temporalData2b = fetchKeyUpDownTimes(task2bData, i, 40);
            const temporalData2c = fetchKeyUpDownTimes(task2cData, i, 41);
            // const temporalData3 = fetchKeyUpDownTimes(task3Data, i, 100);
            // filling task vectors
            task1vector.push(...temporalData1);
            task2avector.push(...temporalData2a);
            task2bvector.push(...temporalData2b);
            task2cvector.push(...temporalData2c);
            //task3vector.push(...temporalData3);
          }
          if (downUp) {
            const temporalData1 = fetchKeyDownUpTimes(task1Data, i, 10);
            const temporalData2a = fetchKeyDownUpTimes(task2aData, i, 43);
            const temporalData2b = fetchKeyDownUpTimes(task2bData, i, 40);
            const temporalData2c = fetchKeyDownUpTimes(task2cData, i, 41);
            // const temporalData3 = fetchKeyDownUpTimes(task3Data, i, 100);
            // filling task vectors
            task1vector.push(...temporalData1);
            task2avector.push(...temporalData2a);
            task2bvector.push(...temporalData2b);
            task2cvector.push(...temporalData2c);
            // task3vector.push(...temporalData3);
          }

          if (upUp) {
            const temporalData1 = fetchUpUpTimes(task1Data, i, 9);
            const temporalData2a = fetchUpUpTimes(task2aData, i, 42);
            const temporalData2b = fetchUpUpTimes(task2bData, i, 39);
            const temporalData2c = fetchUpUpTimes(task2cData, i, 40);
            //const temporalData3 = fetchUpUpTimes(task3Data, i, 100);
            // filling task vectors
            task1vector.push(...temporalData1);
            task2avector.push(...temporalData2a);
            task2bvector.push(...temporalData2b);
            task2cvector.push(...temporalData2c);
            //task3vector.push(...temporalData3);
          }
          if (downDown) {
            const temporalData1 = fetchDownDownTimes(task1Data, i, 9);
            const temporalData2a = fetchDownDownTimes(task2aData, i, 42);
            const temporalData2b = fetchDownDownTimes(task2bData, i, 39);
            const temporalData2c = fetchDownDownTimes(task2cData, i, 40);
            //const temporalData3 = fetchDownDownTimes(task3Data, i, 100);
            // filling task vectors
            task1vector.push(...temporalData1);
            task2avector.push(...temporalData2a);
            task2bvector.push(...temporalData2b);
            task2cvector.push(...temporalData2c);
            //task3vector.push(...temporalData3);
          }
          if (digraph) {
            const temporalData1 = fetchDigraphTimes(task1Data, i, 10);
            const temporalData2a = fetchDigraphTimes(task2aData, i, 43);
            const temporalData2b = fetchDigraphTimes(task2bData, i, 40);
            const temporalData2c = fetchDigraphTimes(task2cData, i, 41);
            //const temporalData3 = fetchDigraphTimes(task3Data, i, 100);
            // filling task vectors
            task1vector.push(...temporalData1);
            task2avector.push(...temporalData2a);
            task2bvector.push(...temporalData2b);
            task2cvector.push(...temporalData2c);
            //task3vector.push(...temporalData3);
          }
          if (trigraph) {
            const temporalData1 = fetchTrigraphTimes(task1Data, i, 10);
            const temporalData2a = fetchTrigraphTimes(task2aData, i, 43);
            const temporalData2b = fetchTrigraphTimes(task2bData, i, 40);
            const temporalData2c = fetchTrigraphTimes(task2cData, i, 41);
            //const temporalData3 = fetchTrigraphTimes(task3Data, i, 100);
            // filling task vectors
            task1vector.push(...temporalData1);
            task2avector.push(...temporalData2a);
            task2bvector.push(...temporalData2b);
            task2cvector.push(...temporalData2c);
            //task3vector.push(...temporalData3);
          }
          if (reaction) {
            const reactionTimeData1 = fetchTaskReactionTimeData(task1Data, i);
            const reactionTimeData2a = fetchTaskReactionTimeData(task2aData, i);
            const reactionTimeData2b = fetchTaskReactionTimeData(task2bData, i);
            const reactionTimeData2c = fetchTaskReactionTimeData(task2cData, i);
            // filling task vectors
            task1vector.push(...reactionTimeData1);
            task2avector.push(...reactionTimeData2a);
            task2bvector.push(...reactionTimeData2b);
            task2cvector.push(...reactionTimeData2c);
          }
          if (keyPreference) {
            const keyPreferenceData1 = fetchKeyPreferenceData(task1Data, i);
            const keyPreferenceData2a = fetchKeyPreferenceData(task2aData, i);
            const keyPreferenceData2b = fetchKeyPreferenceData(task2bData, i);
            const keyPreferenceData2c = fetchKeyPreferenceData(task2cData, i);
            // filling task vectors
            task1vector.push(...keyPreferenceData1);
            task2avector.push(...keyPreferenceData2a);
            task2bvector.push(...keyPreferenceData2b);
            task2cvector.push(...keyPreferenceData2c);
          }
          if (accuracy) {
            const accuracyData1 = fetchAccuracy(task1Data, i);
            const accuracyData2a = fetchAccuracy(task2aData, i);
            const accuracyData2b = fetchAccuracy(task2bData, i);
            const accuracyData2c = fetchAccuracy(task2cData, i);
            // filling task vectors
            task1vector.push(...accuracyData1);
            task2avector.push(...accuracyData2a);
            task2bvector.push(...accuracyData2b);
            task2cvector.push(...accuracyData2c);
          }
          if (typingSpeed) {
            const typingSpeedData1 = fetchTypingSpeedData(task1Data, i);
            const typingSpeedData2a = fetchTypingSpeedData(task2aData, i);
            const typingSpeedData2b = fetchTypingSpeedData(task2bData, i);
            const typingSpeedData2c = fetchTypingSpeedData(task2cData, i);
            // filling task vectors
            task1vector.push(...typingSpeedData1);
            task2avector.push(...typingSpeedData2a);
            task2bvector.push(...typingSpeedData2b);
            task2cvector.push(...typingSpeedData2c);
          }
          // if(freeTypingSpeed){

          // }
          // if(specificKeyProximity){

          // }
          // record for each session
          if (
            task1vector.length > 0 &&
            task2avector.length > 0 &&
            task2bvector.length > 0 &&
            task2cvector.length > 0
            // &&
            //task3vector.length > 0
          ) {
            const userFeatureVector = [user.user_id].concat(
              [String(i)],
              task1vector,
              task2avector,
              task2bvector,
              task2cvector,
              task3vector
            );
            console.log(userFeatureVector);
            allVectors.push(userFeatureVector);
          }
        }
      }
    }
  }

  console.log(allVectors);

  const csvContent = allVectors
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  let filename = "";
  if (upDown) {
    filename += "UD_";
  }
  if (downUp) {
    filename += "DU_";
  }
  if (upUp) {
    filename += "UU_";
  }
  if (downDown) {
    filename += "DD_";
  }
  if (digraph) {
    filename += "digraph_";
  }
  if (trigraph) {
    filename += "trigraph_";
  }
  if (reaction) {
    filename += "Reaction";
  }
  if (keyPreference) {
    filename += "KeyPreference";
  }
  if (accuracy) {
    filename += "Accuracy";
  }
  if (typingSpeed) {
    filename += "TypingSpeed";
  }
  // if (freeTypingSpeed) {
  //   filename += "FreeTypingSpeed";
  // }

  a.download = `${filename}.csv`;
  a.click();

  return allVectors;
};

const Files = () => {
  // task specific temporal data fetch

  return (
    <div className="section">
      <div>
        <div>Pure vectors</div>
        <button
          type="button"
          onClick={() => fetchTaskVectors({ upDown: true })}
        >
          Up down
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ downUp: true })}
        >
          Down up
        </button>

        <button type="button" onClick={() => fetchTaskVectors({ upUp: true })}>
          Up up
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ downDown: true })}
        >
          downDown
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ digraph: true })}
        >
          digraph
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ trigraph: true })}
        >
          trigraph
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ reaction: true })}
        >
          Reaction time data
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ typingSpeed: true })}
        >
          Typing speed data
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ accuracy: true })}
        >
          Accuracy Data
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ keyPreference: true })}
        >
          Key preference data
        </button>
      </div>
      <div>
        <div>Temporal + single non-temporal</div>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ upDown: true, reaction: true })}
        >
          Temp + Reaction time data
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ upDown: true, typingSpeed: true })}
        >
          Temp + Typing speed data
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ upDown: true, accuracy: true })}
        >
          Temp + Accuracy Data
        </button>

        <button
          type="button"
          onClick={() =>
            fetchTaskVectors({ upDown: true, keyPreference: true })
          }
        >
          Temp + Key preference data
        </button>
      </div>
    </div>
  );
};

export { Files, fetchTaskVectors, fetchUsers };
