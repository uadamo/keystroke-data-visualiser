import React, { useEffect, useState } from "react";
import { getDatabase, ref, query, get } from "firebase/database";
import { User, UserProfile } from "../types/Users";

import { app } from "../firebase";
import "./section.css";
import { Task, TaskIteration } from "../types/Tasks";

interface UserTaskRecordProps {
  id: string;
}

const UserTaskRecord = ({ id }: UserTaskRecordProps) => {
  const db = getDatabase(app);
  const task1ref = query(ref(db, `task1/user-${id}`));
  const task2aref = query(ref(db, `task2a/user-${id}`));
  const task2bref = query(ref(db, `task2b/user-${id}`));
  const task2cref = query(ref(db, `task2c/user-${id}`));
  const task3ref = query(ref(db, `task3/user-${id}`));

  const fetchLetterProximityData = () => {
    // to do
  };

  const fetchTypingSpeedData = (taskData: Task[], sessionNumber: number) => {
    const iterationValues: TaskIteration[] = Object.values(
      taskData[`session-${sessionNumber}`]
    );
    const filteredIterations = iterationValues.filter(
      (value) => value.keystroke_list.length > 10
    );
    const typingSpeedArray = new Array(10);
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
    const accuracyArray = new Array(10);
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
    let shiftLeftRatioArray = new Array(10);
    let shiftRightRatioArray = new Array(10);
    let capsLockCountArray = new Array(10);

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
        capsLockCountArray[i] = capsLockCount;
      } catch (e) {
        break;
      }
    }
    return shiftLeftRatioArray
      .concat(shiftRightRatioArray)
      .concat(capsLockCountArray);
  };

  // task non-specific creation time fetch
  const fetchTaskReactionTimeData = (
    taskData: Task[],
    sessionNumber: number
  ) => {
    const reactionTimeArray = new Array(10);

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
  const fetchTask1TemporalData = (taskData: Task[], sessionNumber: number) => {
    const downUpTimes = new Array(10);
    const upDownTimes = new Array(10);

    const iterationValues: TaskIteration[] = Object.values(
      taskData[`session-${sessionNumber}`]
    );
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
        .filter((keystroke) => keystroke.key !== "Shift")
        .filter((keystroke) => keystroke.key !== "CapsLock")
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
        .filter((keystroke) => keystroke.key !== "Shift")
        .filter((keystroke) => keystroke.key !== "CapsLock")
        .sort(
          (keystroke1, keystroke2) =>
            keystroke1.timestamp - keystroke2.timestamp
        );

      const arrayLengthSession = Math.min(
        keyDownArray.length,
        keyUpArray.length,
        10
      );

      for (let keystroke = 0; keystroke < arrayLengthSession; keystroke++) {
        try {
          downUpTimes[keystroke] =
            keyUpArray[keystroke].timestamp -
            keyDownArray[keystroke].globalTimeStamp;
          upDownTimes[keystroke] =
            keyDownArray[keystroke + 1].globalTimeStamp -
            keyUpArray[keystroke].timestamp;
        } catch (e) {
          // correct later
          break;
        }
      }
    }
    return downUpTimes.concat(upDownTimes);
  };

  const fetchTask = async () => {
    const task1vector = new Array([]);
    const task2avector = new Array([]);
    const task2bvector = new Array([]);
    const task2cvector = new Array([]);
    // slightly different vector, with free typing speed - in
    const task3vector = new Array([]);

    // task references
    const task1Snapshot = await get(task1ref);
    const task2aSnapshot = await get(task2cref);
    const task2bSnapshot = await get(task2cref);
    const task2cSnapshot = await get(task2cref);

    // fetchtask() should take features for easy extraction for downloading files

    // subvector for task 1
    if (task1Snapshot) {
      const task1Data: Task[] = task1Snapshot.val();

      // arrays for temporal features

      // task 1
      const session1Task1TemporalData = fetchTask1TemporalData(task1Data, 0);
      const session2Task1TemporalData = fetchTask1TemporalData(task1Data, 1);
      const session3Task1TemporalData = fetchTask1TemporalData(task1Data, 2);

      // arrays for non-temporal features:
      // reaction time:

      // task 1

      const session1Task1ReactionTime = fetchTaskReactionTimeData(task1Data, 0);
      const session2Task1ReactionTime = fetchTaskReactionTimeData(task1Data, 1);
      const session3Task1ReactionTime = fetchTaskReactionTimeData(task1Data, 2);

      const session1Task1KeyPreference = fetchKeyPreferenceData(task1Data, 0);
      const session2Task1KeyPreference = fetchKeyPreferenceData(task1Data, 1);
      const session3Task1KeyPreference = fetchKeyPreferenceData(task1Data, 2);

      const session1Task1AccuracyArray = fetchAccuracy(task1Data, 0);
      const session2Task1AccuracyArray = fetchAccuracy(task1Data, 1);
      const session3Task1AccuracyArray = fetchAccuracy(task1Data, 2);

      const session1Task1TypingSpeedArray = fetchTypingSpeedData(task1Data, 0);
      const session2Task1TypingSpeedArray = fetchTypingSpeedData(task1Data, 1);
      const session3Task1TypingSpeedArray = fetchTypingSpeedData(task1Data, 2);
      // the final feature vectors for each user

      const task1TemporalFeatureVector = session1Task1TemporalData
        .concat(session2Task1TemporalData)
        .concat(session3Task1TemporalData);

      const task1ReactionTimeFeatureVector = session1Task1ReactionTime
        .concat(session2Task1ReactionTime)
        .concat(session3Task1ReactionTime);

      const task1KeyPreferenceFeatureVector = session1Task1KeyPreference
        .concat(session2Task1KeyPreference)
        .concat(session3Task1KeyPreference);

      const task1BackspaceFeatureVector = session1Task1AccuracyArray
        .concat(session2Task1AccuracyArray)
        .concat(session3Task1AccuracyArray);

      const task1TypingSpeedFeatureVector = session1Task1TypingSpeedArray
        .concat(session2Task1TypingSpeedArray)
        .concat(session3Task1TypingSpeedArray);
      // merge all for a feature vector
      //console.log(task1TemporalFeatureVector);
      //console.log(task1ReactionTimeFeatureVector);
      // setTask1Data(task1TemporalFeatureVector);
      // console.log(task1KeyPreferenceFeatureVector);
      //console.log(task1BackspaceFeatureVector);
      console.log(task1TypingSpeedFeatureVector);
    }

    // subvector for task 2a
    if (task2aSnapshot) {
      // setTask2aData(task2aSnapshot.val());
    }

    // subvector for task 2b
    if (task2bSnapshot) {
      // setTask2bData(task2bSnapshot.val());
    }

    // subvector for task 2c
    if (task2cSnapshot) {
      // setTask2cData(task2cSnapshot.val());
    }

    // subvector for task 3 - to be continued
  };

  useEffect(() => {
    fetchTask();
  }, []);
  return <div>//</div>;
};

const Home = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const db = getDatabase(app);
  const userRef = query(ref(db, `users`));

  const fetchUsers = async () => {
    const userSnapshot = await get(userRef);
    let userList: UserProfile[] = [];
    if (userSnapshot) {
      for (let userKey of Object.keys(userSnapshot.val())) {
        for (let userInnerKey of Object.keys(userSnapshot.val()[userKey])) {
          if (userSnapshot.val()[userKey][userInnerKey].session > 2) {
            userList.push(userSnapshot.val()[userKey][userInnerKey]);
          }
        }
      }
      setUsers(userList);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="section">
      {users.length > 0 &&
        users.map((user) => (
          <UserTaskRecord id={user.user_id} key={user.user_id} />
        ))}
      {/* <div className="user-section">
        <h2>Users</h2>
        {Object.keys(users).map((key) =>
          Object.keys(users[key]).map((innerkey) => (
            <div className="user-item" key={innerkey}>
              <div>
                User: {users[key][innerkey].gender}, {users[key][innerkey].age}{" "}
                years old, completed {users[key][innerkey].session} sessions
              </div>
            </div>
          ))
        )}
      </div> */}
      <div className="task1-section"></div>
      <div className="task2a-section"></div>
      <div className="task2b-section"></div>
      <div className="task2c-section"></div>
      <div className="task3a-section"></div>
    </div>
  );
};

export default Home;
