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
import { PasswordUtil } from '@common/utils/password.util';
import { UserRepository } from '@modules/user/user.repository';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * ID로 사용자 찾기
   */
  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new DomainException(DOMAIN_ERRORS.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * 모든 사용자 조회
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  /**
   * 사용자 정보 수정
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new DomainException(DOMAIN_ERRORS.USER_NOT_FOUND);
    }

    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  /**
   * 사용자 삭제
   */
  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new DomainException(DOMAIN_ERRORS.USER_NOT_FOUND);
    }

    await this.userRepository.delete(user.id);
  }
}
