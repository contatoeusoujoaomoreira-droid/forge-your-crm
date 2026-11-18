import { z } from 'zod';

export const normalizedEmail = z.string().trim().toLowerCase().email('Informe um e-mail válido, como nome@empresa.com.');