type KeyUp = {
  altKey: boolean; // false;
  code: string; // "KeyQ";
  ctrlKey: boolean; // false;
  detail: number; // 0;
  eventName: "keyUp";
  key: string; // "q";
  location: 0 | 1; //0;
  metaKey: boolean; // false;
  shiftKey: boolean; // false;
  timestamp: number; // 1728649007953;
  type: "keyup";
};

type KeyDown = {
  ctrlKey: boolean; // false;
  detail: number; // 0;
  eventName: "keyDown";
  globalTimeStamp: number; // 1728649006911;
  key: string; // "q";
  location: 0 | 1 | 2; // 1;
  metaKey: boolean; // false;
  repeated: boolean; // false;
  shiftKey: boolean; // false;
  timestamp: number; //  17051.59999999404;
  type: "keydown";
};

type TaskIteration = {
  end_time: number;
  iteration: number;
  keystroke_list: (KeyUp | KeyDown)[];
  reaction_latency: number;
  start_time: number;
};

// for taskx/user-{id} being mapped
type Task = {
  [key: string]: { [key: string]: TaskIteration };
};

export { Task, TaskIteration };
