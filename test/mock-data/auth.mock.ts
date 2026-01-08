export const authMockData = {
  /**
   * 유효한 회원가입 데이터
   */
  validRegister: {
    email: 'register@motionlab.com',
    password: 'Register1234!',
    name: 'Register User',
  },

  /**
   * 유효한 로그인 데이터
   */
  validLogin: {
    email: 'test@motionlab.com',
    password: 'Test1234!',
  },

  /**
   * 잘못된 비밀번호
   */
  invalidLogin: {
    email: 'test@motionlab.com',
    password: 'WrongPassword123!',
  },

  /**
   * 존재하지 않는 이메일
   */
  notFoundLogin: {
    email: 'notfound@motionlab.com',
    password: 'Test1234!',
  },
};
