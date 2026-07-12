import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Product: a.model({
    name: a.string().required(),
    price: a.float().required(),
    description: a.string(),
    category: a.string(),
    imageUrl: a.string(),
    stock: a.integer().default(0),
  }).authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});