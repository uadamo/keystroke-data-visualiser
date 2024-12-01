import React, { useState } from "react";
import "./section.css";
import { getDatabase, ref, query, get } from "firebase/database";
import { UserProfile } from "../types/Users";
import { app } from "../firebase";
import { Task, TaskIteration } from "../types/Tasks";
import Plot from "react-plotly.js";

const Files = () => {
  const db = getDatabase(app);
  const userRef = query(ref(db, `users`));
  const [finalVect, setFinalVect] = useState<any[]>([]);

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

  interface fetchTaskProps {
    temporal?: boolean;
    reaction?: boolean;
    keyPreference?: boolean;
    accuracy?: boolean;
    typingSpeed?: boolean;
    freeTypingSpeed?: boolean;
    specificKeyProximity?: boolean;
  }

  const fetchTaskVectors = async ({
    temporal,
    reaction,
    keyPreference,
    accuracy,
    typingSpeed,
    freeTypingSpeed,
    specificKeyProximity,
  }: fetchTaskProps) => {
    let allVectors: any[] = [];
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

        let task1vector: any[] = [];
        let task2avector: any[] = [];
        let task2bvector: any[] = [];
        let task2cvector: any[] = [];
        let task3vector: any[] = [];

        if (
          task1Snapshot &&
          task2aSnapshot &&
          task2bSnapshot &&
          task2cSnapshot
        ) {
          const task1Data: Task[] = task1Snapshot.val();
          const task2aData: Task[] = task2aSnapshot.val();
          const task2bData: Task[] = task2bSnapshot.val();
          const task2cData: Task[] = task2cSnapshot.val();
          const task3Data: Task[] = task3Snapshot.val();

          for (let i = 0; i < 3; i++) {
            if (temporal) {
              const temporalData1 = fetchTaskTemporalData(task1Data, i);
              const temporalData2a = fetchTaskTemporalData(task2aData, i);
              const temporalData2b = fetchTaskTemporalData(task2bData, i);
              const temporalData2c = fetchTaskTemporalData(task2cData, i);
              // filling task vectors
              task1vector.push(
                ...temporalData1.concat(
                  Array(240 - temporalData1.length).fill(0)
                )
              );
              task2avector.push(
                ...temporalData2a.concat(
                  Array(1100 - temporalData2a.length).fill(0)
                )
              );
              task2bvector.push(
                ...temporalData2b.concat(
                  Array(980 - temporalData2b.length).fill(0)
                )
              );
              task2cvector.push(
                ...temporalData2c.concat(
                  Array(980 - temporalData2c.length).fill(0)
                )
              );
            }
            if (reaction) {
              const reactionTimeData1 = fetchTaskReactionTimeData(task1Data, i);
              const reactionTimeData2a = fetchTaskReactionTimeData(
                task2aData,
                i
              );
              const reactionTimeData2b = fetchTaskReactionTimeData(
                task2bData,
                i
              );
              const reactionTimeData2c = fetchTaskReactionTimeData(
                task2cData,
                i
              );
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
          }
        }
        if (
          task1vector.length > 0 &&
          task2avector.length > 0 &&
          task2bvector.length > 0 &&
          task2cvector.length > 0
        ) {
          const userFeatureVector = [user.user_id].concat(
            task1vector,
            task2avector,
            task2bvector,
            task2cvector,
            task3vector
          );
          // console.log(userFeatureVector);
          allVectors.push(userFeatureVector);
          setFinalVect((finalVect) => [...finalVect, ...userFeatureVector]);
        }
      }
    }

    return allVectors;
    // Promise.all(allVectors).then((results) => {
    //   return results;
    // });
    // return allVectors;
    // at this point list shows up populated
  };

  return (
    <div className="section">
      <div>
        <div>Pure vectors</div>
        <button
          type="button"
          onClick={async () => {
            const vect = await fetchTaskVectors({ temporal: true });
            console.log(vect);
          }}
        >
          Temporal Data
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
          onClick={() => fetchTaskVectors({ temporal: true, reaction: true })}
        >
          Temp + Reaction time data
        </button>

        <button
          type="button"
          onClick={() =>
            fetchTaskVectors({ temporal: true, typingSpeed: true })
          }
        >
          Temp + Typing speed data
        </button>

        <button
          type="button"
          onClick={() => fetchTaskVectors({ temporal: true, accuracy: true })}
        >
          Temp + Accuracy Data
        </button>

        <button
          type="button"
          onClick={() =>
            fetchTaskVectors({ temporal: true, keyPreference: true })
          }
        >
          Temp + Key preference data
        </button>
      </div>
    </div>
  );
};

export default Files;

// if (task2aSnapshot) {
//   const task2aData: Task[] = task2aSnapshot.val();
//   for (let i = 0; i < 3; i++) {
//     if (temporal) {
//       const temporalData = fetchTaskTemporalData(task2aData, i);
//       // 1000
//       task2avector = temporalData.concat(
//         Array(1100 - temporalData.length).fill(0)
//       );
//     }
//   }
// }
// if (task2bSnapshot) {
//   const task2bData: Task[] = task2bSnapshot.val();
//   for (let i = 0; i < 3; i++) {
//     const temporalData = fetchTaskTemporalData(task2bData, i);
//     // 900
//     task2bvector = temporalData.concat(
//       Array(1000 - temporalData.length).fill(0)
//     );
//   }
// }
// if (task2cSnapshot) {
//   const task2cData: Task[] = task2cSnapshot.val();
//   for (let i = 0; i < 3; i++) {
//     // 900
//     const temporalData = fetchTaskTemporalData(task2cData, i);
//     task2cvector = temporalData.concat(
//       Array(1000 - temporalData.length).fill(0)
//     );
//   }
// }
// if (task3Snapshot) {
//   const task3Data: Task[] = task3Snapshot.val();
//   task3vector.push(task3Data);
// }
