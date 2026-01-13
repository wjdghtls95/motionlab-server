-- 1. 테스트용 DB 추가 생성 (메인 DB는 위에서 자동 생성됨)
CREATE DATABASE IF NOT EXISTS motionlab_test;

-- 2. 권한 부여
-- 이미 Docker가 비밀번호를 설정해서 'root'를 만들어 둔 상태입니다.
-- 여기서는 비밀번호(IDENTIFIED BY) 없이, 오직 권한(GRANT)만 추가합니다.

-- "root" 라는 아이디는 공개되어도 상관없으므로 안전합니다.
GRANT ALL PRIVILEGES ON motionlab_test.* TO 'root'@'%';

-- 3. 적용
FLUSH PRIVILEGES;