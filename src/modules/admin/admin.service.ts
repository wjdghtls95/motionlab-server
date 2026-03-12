import { Injectable } from '@nestjs/common';
import { UserRepository } from '@modules/user/entities/user.repository';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserOutDto } from '@modules/user/dto/user-out.dto';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

@Injectable()
export class AdminService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * 사용자 역할 변경
   */
  async updateUserRole(
    userId: number,
    updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UserOutDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new DomainException(DOMAIN_ERRORS.USER_NOT_FOUND);
    }

    user.role = updateUserRoleDto.role;
    const updatedUser = await this.userRepository.save(user);

    return UserOutDto.of(updatedUser);
  }
}
