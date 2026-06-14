import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  UserProfile: a
    .model({
      email: a.string().required(),
      name: a.string(),
    })
    .authorization((allow: any) => [allow.owner()]), // Corrigido: tipagem explícita
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});