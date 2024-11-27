import React, { useState } from "react";
import "./section.css";
import { getDatabase, ref, query, get } from "firebase/database";
import { UserProfile } from "../types/Users";
import { app } from "../firebase";
import { Task, TaskIteration } from "../types/Tasks";

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

  const fetchTaskVectors = async () => {
    const userList = await fetchUsers();
    if (userList) {
      userList.forEach(async (user) => {
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

        if (task1Snapshot) {
          const task1Data: Task[] = task1Snapshot.val();
          for (let i = 0; i < 3; i++) {
            const temporalData = fetchTaskTemporalData(task1Data, i);
            // 250
            task1vector = temporalData.concat(
              Array(350 - temporalData.length).fill(0)
            );
          }
        }
        if (task2aSnapshot) {
          const task2aData: Task[] = task2aSnapshot.val();
          for (let i = 0; i < 3; i++) {
            const temporalData = fetchTaskTemporalData(task2aData, i);
            // 1000
            task2avector = temporalData.concat(
              Array(1100 - temporalData.length).fill(0)
            );
          }
        }
        if (task2bSnapshot) {
          const task2bData: Task[] = task2bSnapshot.val();
          for (let i = 0; i < 3; i++) {
            const temporalData = fetchTaskTemporalData(task2bData, i);
            // 900
            task2bvector = temporalData.concat(
              Array(1000 - temporalData.length).fill(0)
            );
          }
        }
        if (task2cSnapshot) {
          const task2cData: Task[] = task2cSnapshot.val();
          for (let i = 0; i < 3; i++) {
            // 900
            const temporalData = fetchTaskTemporalData(task2cData, i);
            task2cvector = temporalData.concat(
              Array(1000 - temporalData.length).fill(0)
            );
          }
        }
        // if (task3Snapshot) {
        //   const task3Data: Task[] = task3Snapshot.val();
        //   task3vector.push(task3Data);
        // }
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
          console.log(userFeatureVector);
          setFinalVect((finalVect) => [...finalVect, ...userFeatureVector]);
        }
      });
    }

    // at this point list shows up populated
  };

  return (
    <div className="section">
      <button type="button" onClick={fetchTaskVectors}>
        Download Temporal feature vector
      </button>

      {JSON.stringify(finalVect)}
    </div>
  );
};

export default Files;
