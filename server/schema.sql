USE s105292789_db;

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

INSERT INTO chat_messages (id, room_id, username, text, timestamp, status) VALUES
  (1, 'technology', 'alice_dev', 'Has anyone tried the new M4 MacBook Pro?', 1716000000000, 'seen'),
  (2, 'technology', 'bao_dev', 'Yes! The performance leap is insane. Xcode builds in half the time', 1716000060000, 'seen'),
  (3, 'technology', 'charlie_99', 'Still on Intel... saving up for an upgrade', 1716000120000, 'seen'),
  (4, 'programming', 'dev_life', 'Python vs TypeScript for a new backend - thoughts?', 1716000000000, 'seen'),
  (5, 'programming', 'bao_dev', 'TypeScript all the way. Type safety saves so much debugging time', 1716000060000, 'seen'),
  (6, 'dm:bao_dev:alice_dev', 'alice_dev', 'Hey! Did you see the quantum computing article?', 1716000000000, 'seen'),
  (7, 'dm:bao_dev:alice_dev', 'bao_dev', 'Yes! 100x speed improvements is insane.', 1716000060000, 'seen'),
  (8, 'dm:bao_dev:bob_coder', 'bob_coder', 'Thanks for the help earlier!', 1715993600000, 'delivered')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO chat_reactions (message_id, room_id, emoji, username, created_at) VALUES
  (1, 'technology', '🔥', 'charlie_99', 1716000200000),
  (1, 'technology', '👍', 'bao_dev', 1716000210000),
  (2, 'technology', '❤️', 'alice_dev', 1716000220000),
  (4, 'programming', '🤔', 'bao_dev', 1716000230000),
  (7, 'dm:bao_dev:alice_dev', '🔥', 'alice_dev', 1716000240000)
ON DUPLICATE KEY UPDATE id = id;
