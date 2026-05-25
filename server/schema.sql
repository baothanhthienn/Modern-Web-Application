CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  status ENUM('sent', 'delivered', 'seen') NOT NULL DEFAULT 'sent',
  temp_id VARCHAR(80) NULL,
  PRIMARY KEY (id),
  INDEX idx_chat_messages_room_time (room_id, timestamp),
  INDEX idx_chat_messages_status (room_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_reactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id BIGINT UNSIGNED NOT NULL,
  room_id VARCHAR(120) NOT NULL,
  emoji VARCHAR(20) NOT NULL,
  username VARCHAR(80) NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_chat_reaction (message_id, emoji, username),
  INDEX idx_chat_reactions_message (message_id),
  CONSTRAINT fk_chat_reactions_message
    FOREIGN KEY (message_id)
    REFERENCES chat_messages(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
