import { User } from '@/modules/user/entities/user.entity';
import { UserRepository } from '@/modules/user/user.repository';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '@modules/user/dto/create-user.dto';

export interface CreateTestUserDto {
  email?: string;
  password?: string;
  name?: string;
}

export class TestUserHelper {
  private static userRepository: UserRepository;
  private static userCounter = 0;

  /**
   * UserRepository 초기화
   */
  static initialize(userRepository: UserRepository): void {
    this.userRepository = userRepository;
  }

  /**
   * 테스트 유저 생성
   */
  static async createUser(createUserDto?: CreateUserDto): Promise<User> {
    this.userCounter++;

    const email =
      createUserDto?.email || `test-user-${this.userCounter}@motionlab.com`;
    const password = createUserDto?.password || 'Test1234!';
    const name = createUserDto?.name || `Test User ${this.userCounter}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    // 이제 user는 진짜 User 클래스의 객체이므로 save 가능
    return await this.userRepository.save(user);
  }

  /**
   * 여러 테스트 유저 생성
   */
  static async createUsers(count: number): Promise<User[]> {
    // 비밀번호 해싱 생략 (미리 해싱된 문자열 사용)
    // 실제 '1234'의 Bcrypt 해시값이고 테스트용으로 고정해서 사용
    const users: User[] = [];

    const PRE_HASHED_PASSWORD = '$2b$10$EpRO.dJ1k.y0z.m/..dummyhash..';

    for (let i = 0; i < count; i++) {
      users.push(
        this.userRepository.create({
          email: `bulk${i}@test.com`,
          name: `User${i}`,
          password: PRE_HASHED_PASSWORD,
        }),
      );
    }

    return await this.userRepository.save(users);
  }

  /**
   * 원본 비밀번호 반환
   */
  static getRawPassword(): string {
    return 'Test1234!';
  }

  /**
   * 카운터 초기화
   */
  static resetCounter(): void {
    this.userCounter = 0;
  }
}
