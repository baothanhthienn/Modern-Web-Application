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
