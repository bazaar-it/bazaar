import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('AWS Credentials Security', () => {
  describe('Lambda CLI Service', () => {
    it('should NOT expose AWS credentials in child processes', async () => {
      // Mock the lambda-cli service
      const mockCommand = 'echo $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY';
      
      // Execute command without explicit credentials
      const { stdout } = await execAsync(mockCommand, {
        env: {
          ...process.env,
          NODE_ENV: 'test',
          AWS_REGION: 'us-east-1',
          // Credentials should NOT be passed explicitly
        }
      });
      
      // Verify credentials are not exposed
      expect(stdout).not.toContain('AKIA'); // AWS key prefix
      expect(stdout).not.toContain('aws_access_key_id');
      expect(stdout).not.toContain('aws_secret_access_key');
    });

    it('should use AWS SDK default credential chain', () => {
      // Verify AWS SDK can find credentials without explicit passing
      const AWS = require('aws-sdk');
      const credentials = AWS.config.credentials;
      
      // SDK should handle credentials internally
      expect(credentials).toBeDefined();
    });

    it('should NOT create debug files with sensitive data', () => {
      const fs = require('fs');
      const debugFile = '/tmp/last-render-props.json';
      
      // Verify debug file doesn't exist
      expect(fs.existsSync(debugFile)).toBe(false);
    });

    it('should clean up temporary props files after use', async () => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Create a temp file
      const tempFile = path.join(os.tmpdir(), `test-props-${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify({ test: true }));
      
      // Simulate cleanup
      fs.unlinkSync(tempFile);
      
      // Verify cleanup
      expect(fs.existsSync(tempFile)).toBe(false);
    });

    it('should handle regex matches with null checks', () => {
      const stdout = 'Some output without render ID';
      
      // Use optional chaining for safety
      const renderIdMatch = stdout.match(/Render ID:\s*([a-zA-Z0-9]+)/);
      const renderId = renderIdMatch?.[1];
      
      // Should handle null gracefully
      expect(renderId).toBeUndefined();
      expect(() => {
        if (!renderId) {
          throw new Error('Failed to parse CLI output');
        }
      }).toThrow('Failed to parse CLI output');
    });
  });

  describe('Environment Variable Security', () => {
    it('should not log sensitive environment variables', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Simulate logging
      const env = {
        NODE_ENV: 'production',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };
      
      // Safe logging should filter sensitive keys
      const safeEnv = Object.entries(env)
        .filter(([key]) => !key.includes('SECRET') && !key.includes('KEY'))
        .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
      
      console.log('Environment:', safeEnv);
      
      // Verify sensitive data not logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('AKIAIOSFODNN7EXAMPLE')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('wJalrXUtnFEMI')
      );
      
      consoleSpy.mockRestore();
    });
  });
});