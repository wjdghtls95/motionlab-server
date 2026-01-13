-- MotionLab Database Initialization Script

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sports table
CREATE TABLE IF NOT EXISTS sports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default sports
INSERT INTO sports (name, display_name, description) VALUES
  ('golf', 'Golf', 'Golf swing analysis'),
  ('squat', 'Squat', 'Squat form analysis'),
  ('baseball', 'Baseball', 'Baseball pitching analysis')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Create motions table
CREATE TABLE IF NOT EXISTS motions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  sport_id INT NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  analysis_result JSON,
  ai_feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT,
  INDEX idx_user_id (user_id),
  INDEX idx_sport_id (sport_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
