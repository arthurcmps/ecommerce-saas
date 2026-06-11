// js/aws-config.js
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json'; // Ajuste o caminho se o JSON não estiver na raiz

// Inicializa a AWS
Amplify.configure(outputs);