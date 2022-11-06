import { Client } from '@notionhq/client';

const tokens = [
  'secret_DuuAMolppeA7ct4pLZKjg9HZ7yJgI24c9oEV1jtMYWp',
  'secret_zHxWBNclTbQaQ6I3ltzwkgsL5segtympSp6qmqYHsBe',
  'secret_2eK431WBDMRD0GtPdaxcvcqXKhRdEqt5z1k7aoRsEMI',
];
export const notion = new Client({
  auth: tokens[0], //process.env.NOTION_API_KEY,
});
