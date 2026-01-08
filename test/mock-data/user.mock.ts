import { CreateUserDto } from '@/modules/user/dto/create-user.dto';

export const userMockData = {
  /**
   * 일반 유저
   */
  validUser: {
    email: 'test@motionlab.com',
    password: 'Test1234!',
    name: 'Test User',
  } as CreateUserDto,

  /**
   * 관리자 유저
   */
  adminUser: {
    email: 'admin@motionlab.com',
    password: 'Admin1234!',
    name: 'Admin User',
  } as CreateUserDto,

  /**
   * 추가 유저
   */
  anotherUser: {
    email: 'another@motionlab.com',
    password: 'Another1234!',
    name: 'Another User',
  } as CreateUserDto,
};
