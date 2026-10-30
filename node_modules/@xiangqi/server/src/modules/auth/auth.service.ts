import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../infrastructure/prisma';
import { config } from '../../config';
import { UserProfile, AuthResponse } from '@xiangqi/shared-types';

export function formatUserProfile(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  eloRating: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
}): UserProfile {
  const matchesPlayed = user.wins + user.losses + user.draws;
  const winRate = matchesPlayed > 0 ? Math.round((user.wins / matchesPlayed) * 1000) / 10 : 0;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    eloRating: user.eloRating,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    matchesPlayed,
    winRate,
    createdAt: user.createdAt.toISOString(),
  };
}

export class AuthService {
  async register(email: string, password: string, displayName: string): Promise<AuthResponse> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('Email không hợp lệ');
    }

    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Tên hiển thị phải có ít nhất 2 ký tự');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      throw new Error('Email này đã được sử dụng');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash,
        displayName: trimmedName,
        eloRating: 1200,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: formatUserProfile(user),
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      throw new Error('Vui lòng nhập email và mật khẩu');
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: formatUserProfile(user),
    };
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;
    return formatUserProfile(user);
  }
}

export const authService = new AuthService();

