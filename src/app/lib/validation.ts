// Input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: string;
}

// Sanitize HTML content
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Validate and sanitize prompt text
export function validatePrompt(input: string): ValidationResult {
  const errors: string[] = [];
  let sanitizedValue = '';

  if (!input || typeof input !== 'string') {
    errors.push('Prompt is required');
    return { isValid: false, errors };
  }

  // Sanitize the input
  sanitizedValue = sanitizeHtml(input.trim());

  // Check length
  if (sanitizedValue.length === 0) {
    errors.push('Prompt cannot be empty');
  } else if (sanitizedValue.length > 1500) {
    errors.push('Prompt must be less than 1500 characters');
  }

  // Check for suspicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /alert\s*\(/i,
    /confirm\s*\(/i,
    /prompt\s*\(/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitizedValue)) {
      errors.push('Prompt contains invalid content');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
  };
}

// Validate email
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  let sanitizedValue = '';

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  sanitizedValue = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedValue)) {
    errors.push('Please enter a valid email address');
  }

  // Check length
  if (sanitizedValue.length > 254) {
    errors.push('Email address is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
  };
}

// Validate password
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Check length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password is too long');
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey'
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('Please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate username
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];
  let sanitizedValue = '';

  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
    return { isValid: false, errors };
  }

  sanitizedValue = username.trim();

  // Check length
  if (sanitizedValue.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (sanitizedValue.length > 30) {
    errors.push('Username must be less than 30 characters');
  }

  // Check for valid characters (alphanumeric, underscore, hyphen)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(sanitizedValue)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin',
    'administrator',
    'root',
    'system',
    'support',
    'help',
    'info',
    'contact',
    'about',
    'privacy',
    'terms',
    'login',
    'logout',
    'register',
    'signup',
    'signin'
  ];

  if (reservedUsernames.includes(sanitizedValue.toLowerCase())) {
    errors.push('This username is reserved');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
  };
}

// Validate file upload
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth = 4096,
      maxHeight = 4096
    } = options;

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    // Check image dimensions if it's an image
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (img.width > maxWidth || img.height > maxHeight) {
          errors.push(`Image dimensions must be less than ${maxWidth}x${maxHeight} pixels`);
        }

        resolve({
          isValid: errors.length === 0,
          errors
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        errors.push('Invalid image file');
        resolve({
          isValid: false,
          errors
        });
      };

      img.src = url;
    } else {
      resolve({
        isValid: errors.length === 0,
        errors
      });
    }
  });
}

// Sanitize user input for database queries
export function sanitizeForDatabase(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Validate API request body
export function validateApiRequest(body: any, schema: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const sanitizedBody: any = {};

  for (const [key, rules] of Object.entries(schema)) {
    const value = body[key];

    // Check if required field is present
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip validation if value is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${key} must be a ${rules.type}`);
      continue;
    }

    // String validation
    if (rules.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
        continue;
      }

      const sanitizedValue = sanitizeForDatabase(value);

      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors.push(`${key} must be at least ${rules.minLength} characters long`);
      }

      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(`${key} must be less than ${rules.maxLength} characters`);
      }

      if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
        errors.push(`${key} format is invalid`);
      }

      sanitizedBody[key] = sanitizedValue;
    }

    // Number validation
    if (rules.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${key} must be a number`);
        continue;
      }

      if (rules.min !== undefined && numValue < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }

      if (rules.max !== undefined && numValue > rules.max) {
        errors.push(`${key} must be less than ${rules.max}`);
      }

      sanitizedBody[key] = numValue;
    }

    // Boolean validation
    if (rules.type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push(`${key} must be a boolean`);
        continue;
      }
      sanitizedBody[key] = value;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? sanitizedBody : undefined
  };
} 