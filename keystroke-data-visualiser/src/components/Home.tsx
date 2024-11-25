import React from "react";
import { getDatabase, ref, query, get } from "firebase/database";
import { UserProfile } from "../types/Users";

import { app } from "../firebase";
import "./section.css";
import { Task, TaskIteration } from "../types/Tasks";

const Home = () => {
  const db = getDatabase(app);
  const userRef = query(ref(db, `users`));

  // slightly different vector, with free typing speed - in
  // const task3vector: any[] = [];

  // const fetchLetterProximityData = () => {
  //   // to do
  // };

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
        shiftLeftRatioArray[i] =
          shiftCount > 0 ? shiftLeftCount / shiftCount : 0;
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
  const fetchTaskReactionTimeData = (
    taskData: Task[],
    sessionNumber: number
  ) => {
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
    return reactionTimeArray;
  };

  // task specific temporal data fetch
  const fetchTaskTemporalData = (taskData: Task[], sessionNumber: number) => {
    const downUpTimes: number[] = [];
    const upDownTimes: number[] = [];

    const iterationValues: TaskIteration[] = Object.values(
      taskData[`session-${sessionNumber}`]
    );

    // just a measure to exclude arrays that have a very small amount of keystrokes due to inconsistencies
    const filteredIterations = iterationValues.filter(
      (value) => value.keystroke_list.length > 10
    );

    for (let i = 0; i < 10; i++) {
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
          (keystroke1, keystroke2) =>
            keystroke1.timestamp - keystroke2.timestamp
        );

      const arrayLengthSession = Math.min(
        keyDownArray.length,
        keyUpArray.length
      );

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
    return downUpTimes.concat(upDownTimes);
  };

  interface fetchTaskProps {
    id: string;
    temporal?: boolean;
    reaction?: boolean;
    keyPreference?: boolean;
    accuracy?: boolean;
    typingSpeed?: boolean;
    freeTypingSpeed?: boolean;
    specificKeyProximity?: boolean;
  }

  const fetchTask = async ({
    id,
    temporal,
    reaction,
    keyPreference,
    accuracy,
    typingSpeed,
    freeTypingSpeed,
    specificKeyProximity,
  }: fetchTaskProps) => {
    const db = getDatabase(app);

    const task1ref = query(ref(db, `task1/user-${id}`));
    const task2aref = query(ref(db, `task2a/user-${id}`));
    const task2bref = query(ref(db, `task2b/user-${id}`));
    const task2cref = query(ref(db, `task2c/user-${id}`));
    const task3ref = query(ref(db, `task3/user-${id}`));

    const task1Snapshot = await get(task1ref);
    const task2aSnapshot = await get(task2aref);
    const task2bSnapshot = await get(task2bref);
    const task2cSnapshot = await get(task2cref);
    const task3Snapshot = await get(task3ref);

    const task1vector: any[] = [];
    const task2avector: any[] = [];
    const task2bvector: any[] = [];
    const task2cvector: any[] = [];
    // fetchtask() should take features for easy extraction for downloading files

    // subvector for task 1
    if (task1Snapshot) {
      const task1Data: Task[] = task1Snapshot.val();
      for (let i = 0; i < 3; i++) {
        if (temporal) {
          const tempData = fetchTaskTemporalData(task1Data, i);
          task1vector.push(tempData);
        }
        if (reaction) {
          task1vector.push(() => fetchTaskReactionTimeData(task1Data, i));
        }
        if (keyPreference) {
          task1vector.push(() => fetchKeyPreferenceData(task1Data, i));
        }
        if (accuracy) {
          task1vector.push(() => fetchAccuracy(task1Data, i));
        }
        if (typingSpeed) {
          task1vector.push(() => fetchTypingSpeedData(task1Data, i));
        }
      }
    }

    // subvector for task 2a
    if (task2aSnapshot) {
      const task2aData: Task[] = task2aSnapshot.val();
      for (let i = 0; i < 3; i++) {
        if (temporal) {
          // the quick brown fox jumps over the lazy dog
          const tempData = fetchTaskTemporalData(task2aData, i);
          task2avector.push(tempData);
        }
        if (reaction) {
          task2avector.push(() => fetchTaskReactionTimeData(task2aData, i));
        }
        if (keyPreference) {
          task2avector.push(() => fetchKeyPreferenceData(task2aData, i));
        }
        if (accuracy) {
          task2avector.push(() => fetchAccuracy(task2aData, i));
        }
        if (typingSpeed) {
          task2avector.push(() => fetchTypingSpeedData(task2aData, i));
        }
      }
    }
    // subvector for task 2b
    if (task2bSnapshot) {
      const task2bData: Task[] = task2bSnapshot.val();
      for (let i = 0; i < 3; i++) {
        if (temporal) {
          // liquor ...
          const tempData = fetchTaskTemporalData(task2bData, i);
          task2bvector.push(tempData);
        }
        if (reaction) {
          task2bvector.push(() => fetchTaskReactionTimeData(task2bData, i));
        }
        if (keyPreference) {
          task2bvector.push(() => fetchKeyPreferenceData(task2bData, i));
        }
        if (accuracy) {
          task2bvector.push(() => fetchAccuracy(task2bData, i));
        }
        if (typingSpeed) {
          task2bvector.push(() => fetchTypingSpeedData(task2bData, i));
        }
      }
    }
    //subvector for task 2c
    if (task2cSnapshot) {
      const task2cData: Task[] = task2cSnapshot.val();
      for (let i = 0; i < 3; i++) {
        if (temporal) {
          // LOOSE....
          const tempData = fetchTaskTemporalData(task2cData, i);
          task2cvector.push(tempData);
        }
        if (reaction) {
          task2cvector.push(() => fetchTaskReactionTimeData(task2cData, i));
        }
        if (keyPreference) {
          task2cvector.push(() => fetchKeyPreferenceData(task2cData, i));
        }
        if (accuracy) {
          task2cvector.push(() => fetchAccuracy(task2cData, i));
        }
        if (typingSpeed) {
          task2cvector.push(() => fetchTypingSpeedData(task2cData, i));
        }
      }
    }

    const fullVector = task1vector
      .concat(task2avector)
      .concat(task2bvector)
      .concat(task2cvector);

    // console.log(fullVector);
    return fullVector;
  };

  const fetchUsers = async () => {
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

  const fetchTaskVectors = async () => {
    const userList = await fetchUsers();
    let finalVector: any[] = [];
    if (userList) {
      userList.forEach((user) => {
        fetchTask({ id: user.user_id, temporal: true }).then((value) =>
          finalVector.concat(value)
        );
      });
      console.log(finalVector);
    } else {
      console.log("no");
    }
  };

  return (
    <div className="section">
      <button onClick={fetchTaskVectors}>Download file</button>
      <div className="task1-section"></div>
      <div className="task2a-section"></div>
      <div className="task2b-section"></div>
      <div className="task2c-section"></div>
      <div className="task3a-section"></div>
    </div>
  );
};

export default Home;
