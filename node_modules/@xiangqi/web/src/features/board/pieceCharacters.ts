import { PieceType, PlayerColor } from '@xiangqi/shared-types';

export const PIECE_CHARACTERS: Record<PlayerColor, Record<PieceType, string>> = {
  RED: {
    GENERAL: '帥',
    ADVISOR: '仕',
    ELEPHANT: '相',
    HORSE: '傌',
    CHARIOT: '俥',
    CANNON: '炮',
    SOLDIER: '兵',
  },
  BLACK: {
    GENERAL: '將',
    ADVISOR: '士',
    ELEPHANT: '象',
    HORSE: '馬',
    CHARIOT: '車',
    CANNON: '砲',
    SOLDIER: '卒',
  },
};

export const PIECE_VIETNAMESE_NAMES: Record<PlayerColor, Record<PieceType, string>> = {
  RED: {
    GENERAL: 'Tướng Đỏ',
    ADVISOR: 'Sĩ Đỏ',
    ELEPHANT: 'Tượng Đỏ',
    HORSE: 'Mã Đỏ',
    CHARIOT: 'Xe Đỏ',
    CANNON: 'Pháo Đỏ',
    SOLDIER: 'Binh Đỏ',
  },
  BLACK: {
    GENERAL: 'Tướng Đen',
    ADVISOR: 'Sĩ Đen',
    ELEPHANT: 'Tượng Đen',
    HORSE: 'Mã Đen',
    CHARIOT: 'Xe Đen',
    CANNON: 'Pháo Đen',
    SOLDIER: 'Tốt Đen',
  },
};

