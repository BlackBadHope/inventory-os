import { ASCII_COLORS } from './constants';

export const getPriorityColorClass = (p) => ({
  High: { bg: ASCII_COLORS.priorityHigh.split(' ')[0], text: ASCII_COLORS.priorityHigh.split(' ')[1] },
  Normal: { bg: ASCII_COLORS.priorityNormal.split(' ')[0], text: ASCII_COLORS.priorityNormal.split(' ')[1] },
  Low: { bg: ASCII_COLORS.priorityLow.split(' ')[0], text: ASCII_COLORS.priorityLow.split(' ')[1] },
  Dispose: { bg: ASCII_COLORS.priorityDispose.split(' ')[0], text: ASCII_COLORS.priorityDispose.split(' ')[1] }
}[p] || { bg: 'bg-gray-700', text: 'text-gray-400' });

export const isExpired = (d) => d && new Date(d) < new Date(new Date().setHours(0, 0, 0, 0)); 