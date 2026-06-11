import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json'; 

// Inicializa a AWS
Amplify.configure(outputs);

// Dublês temporários para o Vite compilar as telas que ainda não foram migradas
export const auth = {};
export const db = {};
export const storage = {};