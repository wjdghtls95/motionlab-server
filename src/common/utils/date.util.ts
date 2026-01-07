export class DateUtil {
  /**
   * 현재 시각을 반환 (테스트 시 모킹 가능)
   */
  static now(): Date {
    return new Date();
  }

  /**
   * 날짜를 ISO 문자열로 변환
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * 특정 일수를 더한 날짜 반환
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 두 날짜 사이의 일수 차이
   */
  static diffInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 특정 시간을 더한 날짜 반환
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * 특정 분을 더한 날짜 반환
   */
  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * 날짜가 과거인지 확인
   */
  static isPast(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * 날짜가 미래인지 확인
   */
  static isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }
}
