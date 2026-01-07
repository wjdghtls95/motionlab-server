import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 새 사용자 생성
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // 이메일 중복 체크
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // pw 해싱
    const hashedPw = await bcrypt.hash(createUserDto.password, 10);

    // create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPw,
    });

    return this.userRepository.save(user);
  }

  /**
   * 이메일로 사용자 찾기
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * ID로 사용자 찾기
   */
  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 모든 사용자 조회
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * 사용자 정보 수정
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  /**
   * 사용자 삭제
   */
  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.delete(user.id);
  }

  /**
   * 비밀번호 검증
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
