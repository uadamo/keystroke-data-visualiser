type UserProfile = {
  age: string;
  gender: string;
  session: number;
  user_id: string;
};

type User = {
  [key: string]: { [key: string]: UserProfile };
};

export { User, UserProfile };
