import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Subject } from 'rxjs';

// Mock simplified ChatPanel component for testing
// In a real test, you would import the actual component
const ChatPanel = ({ projectId }: { projectId: string }) => {
  const [messages, setMessages] = React.useState<Array<{
    id: string;
    content: string;
    isUser: boolean;
    status?: string;
  }>>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  
  // Mock subject for streaming events
  const streamSubject = React.useRef(new Subject());
  
  // Mock function to send a message
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId,
      content: message,
      isUser: true
    }]);
    
    // Clear input and set streaming state
    setInputValue('');
    setIsStreaming(true);
    
    // Add assistant message placeholder
    const assistantMsgId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      content: '...',
      isUser: false,
      status: 'thinking'
    }]);
    
    // Simulate streaming response
    setTimeout(() => {
      // First status update
      streamSubject.current.next({
        type: 'status',
        status: 'thinking'
      });
      
      // First content chunk
      setTimeout(() => {
        streamSubject.current.next({
          type: 'delta',
          content: 'I\'m processing your request for '
        });
      }, 200);
      
      // Second content chunk
      setTimeout(() => {
        streamSubject.current.next({
          type: 'delta',
          content: 'a fireworks animation...'
        });
      }, 400);
      
      // Tool start event
      setTimeout(() => {
        streamSubject.current.next({
          type: 'tool_start',
          name: 'generateRemotionComponent'
        });
      }, 800);
      
      // Tool result event
      setTimeout(() => {
        streamSubject.current.next({
          type: 'tool_result',
          name: 'generateRemotionComponent',
          success: true,
          finalContent: 'Component built successfully',
          jobId: 'test-job-123'
        });
      }, 1500);
      
      // Complete event
      setTimeout(() => {
        streamSubject.current.next({
          type: 'complete',
          finalContent: 'I\'ve created a fireworks animation and added it to your timeline at position 0:05!'
        });
      }, 2000);
      
      // Finalize
      setTimeout(() => {
        streamSubject.current.next({
          type: 'finalized',
          status: 'success'
        });
        
        setIsStreaming(false);
      }, 2200);
    }, 100);
  };
  
  // Handle streaming events
  React.useEffect(() => {
    const subscription = streamSubject.current.subscribe({
      next: (event: any) => {
        if (event.type === 'delta') {
          // For delta events, append to the last assistant message
          setMessages(prev => {
            const newMessages = [...prev];
            const lastAssistantIndex = newMessages.findIndex(m => !m.isUser);
            
            if (lastAssistantIndex !== -1) {
              const assistantMsg = newMessages[lastAssistantIndex];
              // Only append if not the initial placeholder
              if (assistantMsg.content !== '...') {
                newMessages[lastAssistantIndex] = {
                  ...assistantMsg,
                  content: assistantMsg.content + event.content
                };
              } else {
                newMessages[lastAssistantIndex] = {
                  ...assistantMsg,
                  content: event.content
                };
              }
            }
            
            return newMessages;
          });
        }
        else if (event.type === 'status') {
          // Update status of the last assistant message
          setMessages(prev => {
            const newMessages = [...prev];
            const lastAssistantIndex = newMessages.findIndex(m => !m.isUser);
            
            if (lastAssistantIndex !== -1) {
              newMessages[lastAssistantIndex] = {
                ...newMessages[lastAssistantIndex],
                status: event.status
              };
            }
            
            return newMessages;
          });
        }
        else if (event.type === 'complete') {
          // Replace content with final complete content
          setMessages(prev => {
            const newMessages = [...prev];
            const lastAssistantIndex = newMessages.findIndex(m => !m.isUser);
            
            if (lastAssistantIndex !== -1) {
              newMessages[lastAssistantIndex] = {
                ...newMessages[lastAssistantIndex],
                content: event.finalContent,
                status: 'success'
              };
            }
            
            return newMessages;
          });
        }
        else if (event.type === 'tool_start') {
          // Add a new message for tool execution
          setMessages(prev => [...prev, {
            id: `tool-${event.name}-${Date.now()}`,
            content: `Using tool: ${event.name}...`,
            isUser: false,
            status: 'tool_calling'
          }]);
        }
        else if (event.type === 'tool_result' && event.finalContent) {
          // Update the tool message with the result
          setMessages(prev => {
            const newMessages = [...prev];
            const toolIndex = newMessages.findIndex(m => 
              !m.isUser && m.content.includes(`Using tool: ${event.name}`)
            );
            
            if (toolIndex !== -1) {
              newMessages[toolIndex] = {
                ...newMessages[toolIndex],
                content: event.finalContent,
                status: event.success ? 'success' : 'error'
              };
            }
            
            return newMessages;
          });
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  return (
    <div data-testid="chat-panel">
      <div className="messages" data-testid="message-list">
        {messages.map(msg => (
          <div 
            key={msg.id}
            className={`message ${msg.isUser ? 'user-message' : 'assistant-message'}`}
            data-testid={msg.isUser ? 'user-message' : 'assistant-message'}
            data-status={msg.status}
          >
            {msg.content}
          </div>
        ))}
      </div>
      
      <form 
        onSubmit={e => {
          e.preventDefault();
          sendMessage(inputValue);
        }}
        data-testid="message-form"
      >
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Type your request..."
          data-testid="message-input"
          disabled={isStreaming}
        />
        <button 
          type="submit" 
          disabled={isStreaming || !inputValue.trim()}
          data-testid="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

// Tests
describe('Chat Streaming UI', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });
  
  it('should show streaming updates in the UI', async () => {
    // Render the component
    render(<ChatPanel projectId="test-project" />);
    
    // Verify initial state
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.queryByTestId('user-message')).not.toBeInTheDocument();
    
    // Type a message
    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Create a fireworks animation' } });
    
    // Send the message
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Verify user message is added
    await waitFor(() => {
      expect(screen.getByTestId('user-message')).toHaveTextContent('Create a fireworks animation');
    });
    
    // Verify assistant starts responding
    await waitFor(() => {
      expect(screen.getByTestId('assistant-message')).toBeInTheDocument();
    });
    
    // Verify input is disabled during streaming
    expect(screen.getByTestId('message-input')).toBeDisabled();
    expect(screen.getByTestId('send-button')).toBeDisabled();
    
    // Wait for streaming to complete
    await waitFor(() => {
      // Find all assistant messages
      const assistantMessages = screen.getAllByTestId('assistant-message');
      // Check for the final message with success status
      const finalMessage = assistantMessages.find(msg => 
        msg.getAttribute('data-status') === 'success' && 
        msg.textContent?.includes('I\'ve created a fireworks animation')
      );
      expect(finalMessage).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Verify tool messages are present
    const assistantMessages = screen.getAllByTestId('assistant-message');
    expect(assistantMessages.length).toBeGreaterThanOrEqual(2); // At least user message + complete message
    
    // Verify input is enabled again after streaming
    await waitFor(() => {
      expect(screen.getByTestId('message-input')).not.toBeDisabled();
    });
  }, 5000); // Increase timeout for this test
  
  it('should handle multiple streaming events correctly', async () => {
    // Render the component
    render(<ChatPanel projectId="test-project" />);
    
    // Send first message
    fireEvent.change(screen.getByTestId('message-input'), { 
      target: { value: 'Create a fireworks animation' } 
    });
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Wait for first streaming to complete
    await waitFor(() => {
      const assistantMessages = screen.getAllByTestId('assistant-message');
      const finalMessage = assistantMessages.find(msg => 
        msg.getAttribute('data-status') === 'success'
      );
      expect(finalMessage).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Send second message
    fireEvent.change(screen.getByTestId('message-input'), {
      target: { value: 'Make the fireworks blue' }
    });
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Wait for second streaming to complete
    await waitFor(() => {
      const assistantMessages = screen.getAllByTestId('assistant-message');
      // We should have multiple assistant messages now
      expect(assistantMessages.length).toBeGreaterThanOrEqual(4);
    }, { timeout: 3000 });
  }, 8000);
}); 