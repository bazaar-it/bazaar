"use client";
import React, { useEffect, useRef, useState } from 'react';

const AirbnbVideoPlayer: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTimestamp = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      if (isPlaying && timestamp - lastTimestamp >= frameInterval) {
        setCurrentFrame(prev => (prev + 1) % 300); // 10 seconds at 30fps
        lastTimestamp = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string; easing?: string }) => {
    const [inputMin, inputMax] = inputRange;
    const [outputMin, outputMax] = outputRange;
    
    if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
    if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
    
    let progress = (frame - inputMin) / (inputMax - inputMin);
    
    if (options?.easing === "easeInOut") {
      progress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    } else if (options?.easing === "easeOut") {
      progress = 1 - Math.pow(1 - progress, 3);
    }
    
    return outputMin + progress * (outputMax - outputMin);
  };

  const AirbnbApp: React.FC = () => {
    const frame = currentFrame;
    
    // Show logo screen for first 90 frames (3 seconds)
    if (frame < 90) {
      return (
        <div style={{
          width: '375px',
          height: '812px',
          background: '#FF5A5F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative'
        }}>
          {/* Status bar - simplified without icons */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '44px',
            background: '#FF5A5F'
          }}>
          </div>
          
          {/* Airbnb logo */}
          <div style={{
            width: '80%',
            maxWidth: '280px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMTYxIiB2aWV3Qm94PSIwIDAgNTEyIDE2MSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE0Ny41MDggMTEzLjk5NmMtLjcyLTIuMDIyLTEuNTYyLTMuOTc4LTIuMzYzLTUuNzlhNTQxIDU0MSAwIDAgMC0zLjc3Mi04LjI4MmwtLjEtLjIxNWExODUzIDE4NTMgMCAwIDAtMzUuNTMtNzIuNjY4bC0uNTI5LTEuMDI0YTQ3MyA0NzMgMCAwIDAtMy45MjYtNy41MDVBNDguOCA0OC44IDAgMCAwIDk1LjUxIDkuNjJhMjYuOSAyNi45IDAgMCAwLTkuMjQ4LTcuMDk4YTI2Ljk1IDI2Ljk1IDAgMCAwLTIyLjc3Ni4wMDNhMjYuOSAyNi45IDAgMCAwLTkuMjQ2IDcuMWE0OSA0OSAwIDAgMC01Ljc3MyA4Ljg5YTQ4MSA0ODEgMCAwIDAtMy45NjIgNy41NzRsLS40OS45NUExODU1IDE4NTUgMCAwIDAgOC40ODQgOTkuNzFsLS4xNjIuMzVhNTQ3IDU0NyAwIDAgMC0zLjcwOSA4LjE0NWMtLjggMS44MTEtMS42NDEgMy43NjYtMi4zNjIgNS43OTNhMzUuNSAzNS41IDAgMCAwLTEuOTE2IDE3LjMwOGEzNC4yIDM0LjIgMCAwIDAgNi45MjQgMTYuMTczYTM0LjMgMzQuMyAwIDAgMCAxNC4wNTUgMTAuNjA2YTM0LjkgMzQuOSAwIDAgMCAxMy4xNTEgMi41NDRxMi4xMjYgMCA0LjIzOC0uMjQ3YTQzLjIgNDMuMiAwIDAgMCAxNi4xNzItNS40NTZjNi41MjMtMy42NjUgMTIuOTY2LTkuMDM2IDIwLjAwNC0xNi43MTFjNy4wMzggNy42NzUgMTMuNDggMTMuMDQ2IDIwLjAwNCAxNi43MWE0My4yIDQzLjIgMCAwIDAgMTYuMTcyIDUuNDU3YTM3IDM3IDAgMCAwIDQuMjM4LjI0N2M0LjUwNy4wMSA4Ljk3My0uODU0IDEzLjE1LTIuNTQ0YTM0LjMgMzQuMyAwIDAgMCAxNC4wNTYtMTAuNjA2YTM0LjIgMzQuMiAwIDAgMCA2LjkyNC0xNi4xNzNhMzUuNTQgMzUuNTQgMCAwIDAtMS45MTUtMTcuMzFtLTcyLjYyOSA4LjM2N2MtOC43MTMtMTEuMDQ0LTE0LjMwMy0yMS4zLTE2LjI2NS0yOS44OTdhMjYuNCAyNi40IDAgMCAxLS41Ni05Ljg1N2ExNi4xIDE2LjEgMCAwIDEgMi41OTMtNi43MzlhMTcuOTUgMTcuOTUgMCAwIDEgNi4zMDItNS4xNWExOCAxOCAwIDAgMSAxNS44NjIuMDAyYTE3Ljk1IDE3Ljk1IDAgMCAxIDYuMzAxIDUuMTVhMTYuMSAxNi4xIDAgMCAxIDIuNTkzIDYuNzRhMjYuNSAyNi41IDAgMCAxLS41NjIgOS44NmMtMS45NjQgOC41OTctNy41NTMgMTguODUtMTYuMjY0IDI5Ljg5MW02NC4zNjggNy40ODlhMjMuOSAyMy45IDAgMCAxLTQuODQxIDExLjMwN2EyMy45NyAyMy45NyAwIDAgMS05LjgyOCA3LjQxNmEyNS4wNSAyNS4wNSAwIDAgMS0xMi4zMzYgMS42MTRhMzIuNiAzMi42IDAgMCAxLTEyLjMxNy00LjIwN2MtNS44MDctMy4yNjItMTEuNjg1LTguMjctMTguMy0xNS42MTdjMTAuNTMtMTIuOTgzIDE3LjEwNi0yNC45NSAxOS41NC0zNS42MWEzNi42IDM2LjYgMCAwIDAgLjctMTMuN2EyNi4zIDI2LjMgMCAwIDAtNC4yNzQtMTAuOTg1YTI4LjIgMjguMiAwIDAgMC05Ljk4OS04LjQyN2EyOC4yNiAyOC4yNiAwIDAgMC0yNS40NDQgMGEyOC4yIDI4LjIgMCAwIDAtOS45OSA4LjQyNWEyNi4zIDI2LjMgMCAwIDAtNC4yNzQgMTAuOTgxYTM2LjYgMzYuNiAwIDAgMCAuNjk2IDEzLjY5NmMyLjQzMyAxMC42NjMgOS4wMDkgMjIuNjM0IDE5LjU0MiAzNS42MjFjLTYuNjE0IDcuMzQ2LTEyLjQ5MiAxMi4zNTQtMTguMjk5IDE1LjYxN2EzMi42IDMyLjYgMCAwIDEtMTIuMzE3IDQuMjA2YTI1LjA1IDI1LjA1IDAgMCAxLTEyLjMzNy0xLjYxNGEyNCAyNCAwIDAgMS05LjgyNy03LjQxNWEyMy45IDIzLjkgMCAwIDEtNC44NC0xMS4zMDhhMjUuMiAyNS4yIDAgMCAxIDEuNDI2LTEyLjQyYy41NzQtMS42MTYgMS4yNDctMy4yIDIuMDgtNS4wODRhNTQzIDU0MyAwIDAgMSAzLjYzOS03Ljk5MWwuMTYyLS4zNTJhMTg0NCAxODQ0IDAgMCAxIDM1LjMzNi03Mi4yNjZsLjQ5Mi0uOTU1YzEuMjYtMi40NDMgMi41NjItNC45NyAzLjg3Ni03LjQxMWEzOS43IDM5LjcgMCAwIDEgNC41MzktNy4wODdhMTYuNjUgMTYuNjUgMCAwIDEgMjUuNjMxLS4wMDJhMzkuNSAzOS41IDAgMCAxIDQuNTQgNy4wODRjMS4zMDEgMi40MiAyLjU5MiA4LjkyNCAzLjg0MSA3LjM0NWwuNTMgMS4wMjdhMTg0MiAxODQyIDAgMCAxIDM1LjMzNSA3Mi4yNjdsLjEuMjE2YzEuMjMgMi42NjMgMi41MDMgNS40MTUgMy43MDEgOC4xMjZjLjgzNCAxLjg4NiAxLjUwOCAzLjQ3MiAyLjA4MSA1LjA4MmEyNS4yIDI1LjIgMCAwIDEgMS40MjYgMTIuNDJtNjkuOTkzLTguNzgxcS02LjAxNSAwLTExLjA3LTIuNDExYy0zLjM3LTEuNjA4LTYuMjU3LTMuODYtOC44MjQtNi43NTNzLTQuNDkyLTYuMjctNS45MzctOS45NjljLTEuNDQ0LTMuODU5LTIuMDg2LTguMDQtMi4wODYtMTIuNTQxcy44MDMtOC44NDQgMi4yNDctMTIuNzAzczMuNTMtNy4yMzUgNi4wOTctMTAuMjljMi41NjctMi44OTQgNS42MTUtNS4zMDYgOS4xNDUtNi45MTRzNy4yMi0yLjQxMiAxMS4zOTItMi40MTJjNC4wMSAwIDcuNTQuODA0IDEwLjc1IDIuNTczYzMuMjA5IDEuNjA4IDUuNzc2IDQuMDIgNy44NjEgNy4wNzRsLjQ4Mi03Ljg3OGgxNC43NnY2MC42MTdoLTE0Ljc2bC0uNDgyLTguODQzYy0yLjA4NSAzLjIxNS00LjgxMyA1Ljc4OC04LjM0MyA3LjcxN2MtMy4yMDkgMS43Ny03LjA2IDIuNzM0LTExLjIzMSAyLjczNG0zLjg1Mi0xNC40N2MyLjg4OCAwIDUuNDU1LS44MDQgNy44NjItMi4yNTFjMi4yNDYtMS42MDggNC4wMS0zLjY5OCA1LjQ1NS02LjI3YzEuMjgzLTIuNTczIDEuOTI1LTUuNjI4IDEuOTI1LTkuMDA1cy0uNjQyLTYuNDMyLTEuOTI1LTkuMDA0Yy0xLjI4NC0yLjU3My0zLjIxLTQuNjYzLTUuNDU1LTYuMjdjLTIuMjQ3LTEuNjA5LTQuOTc0LTIuMjUyLTcuODYyLTIuMjUycy01LjQ1NS44MDQtNy44NjIgMi4yNTFjLTIuMjQ2IDEuNjA4LTQuMDExIDMuNjk4LTUuNDU1IDYuMjdjLTEuMjg0IDIuNTczLTEuOTI2IDUuNjI4LTEuOTI2IDkuMDA1cy42NDIgNi40MzIgMS45MjYgOS4wMDRjMS4yODMgMi41NzMgMy4yMDkgNC42NjMgNS40NTUgNi4yN2MyLjQwNyAxLjQ0OCA0Ljk3NCAyLjI1MiA3Ljg2MiAyLjI1Mm01Ni4xNTYtNjQuMTU1YzAgMS43NjktLjMyMSAzLjM3Ny0xLjEyNCA0LjY2M2E5LjMgOS4zIDAgMCAxLTMuMzY5IDMuMjE2Yy0xLjQ0NC44MDQtMy4wNDggMS4xMjUtNC42NTIgMS4xMjVzLTMuMjEtLjMyMS00LjY1NC0xLjEyNWE5LjMgOS4zIDAgMCAxLTMuMzY5LTMuMjE2Yy0uODAyLTEuNDQ3LTEuMTIzLTIuODk0LTEuMTIzLTQuNjYzYzAtMS43NjguMzItMy4zNzYgMS4xMjMtNC42NjNjLjgwMi0xLjQ0NyAxLjkyNS0yLjQxMSAzLjM3LTMuMjE1YzEuNDQzLS44MDQgMy4wNDgtMS4xMjYgNC42NTMtMS4xMjZzMy4yMDguMzIyIDQuNjUyIDEuMTI2YTkuMyA5LjMgMCAwIDEgMy4zNyAzLjIxNWMuNjQxIDEuMjg3IDEuMTIzIDIuNzM0IDEuMTIzIDQuNjYzbS0xNy4xNjggNzYuODU3VjU4LjY4NWgxNi4wNDR2NjAuNjE3em01OC44ODQtNDQuN3YuMTYyYy0uODAyLS4zMjItMS43NjUtLjQ4My0yLjU2OC0uNjQzYy0uOTYyLS4xNjEtMS43NjUtLjE2MS0yLjcyNy0uMTYxYy00LjQ5MyAwLTcuODYyIDEuMjg2LTEwLjEwOCA0LjAyYy0yLjQwNyAyLjczMy0zLjUzIDYuNTkyLTMuNTMgMTEuNTc2djI5Ljc0NmgtMTYuMDQ0VjU4LjY4NWgxNC43NmwuNDgyIDkuMTY1YzEuNjA0LTMuMjE2IDMuNTMtNS42MjggNi4yNTctNy4zOTZjMi41NjctMS43NyA1LjYxNS0yLjU3MyA5LjE0NS0yLjU3M2MxLjEyNCAwIDIuMjQ3LjE2IDMuMjEuMzIxYy40OCUxNjEuODAxLjE2MSAxLjEyMy4zMjJ6bTYuNDE3IDQ0Ljd2LTg1LjU0aDE2LjA0NXYzMi42NGMyLjI0Ni0yLjg5MyA4LjgxMy01LjE0NSA4LjAyMi02LjkxM2MzLjIxLTEuNjA4IDYuNzQtMi41NzMgMTAuNzUtMi41NzNxNi4wMTYgMCAxMS4wNyAyLjQxMmMzLjM3IDEuNjA4IDYuMjU4IDMuODU5IDguODI1IDYuNzUzYzIuNTY4IDIuODk0IDQuNDkzIDYuMjcxIDUuOTM3IDkuOTdjMS40NDQgMy44NTggMi4wODUgOC4wMzggMi4wODUgMTIuNTRjMCA0LjUwMy0uODAyIDguODQ0LTIuMjQ1IDEyLjcwM2MtMS40NDUgMy44NTktMy41MyA3LjIzNS02LjA5OCAxMC4yOWMtMi41NjcgMi44OTUtNS42MTUgNS4zMDYtOS4xNDUgNi45MTRzLTcuMjIgMi40MTItMTEuMzkxIDIuNDEyYy00LjAxMiAwLTcuNTQxLS44MDQtMTAuNzUtMi41NzNjLTMuMjEtMS42MDgtNS43NzctNC4wMi03Ljg2Mi03LjA3NGwtLjQ4MiA3Ljg3OHptMzAuOTY2LTEyLjcwMmMyLjg4OSAwIDUuNDU2LS44MDQgNy44NjItMi4yNTFjMi4yNDYtMS42MDggNC4wMTEtMy42OTggNS40NTUtNi4yN2MxLjI4NC0yLjU3MyAxLjkyNi01LjYyOCAxLjkyNi05LjAwNXMtLjY0Mi02LjQzMi0xLjkyNi05LjAwNGMtMS40NDQtMi41NzMtMy4yMDktNC42NjMtNS40NTUtNi4yN2MtMi4yNDYtMS42MDktNC45NzMtMi4yNTItNy44NjItMi4yNTJjLTIuODg4IDAtNS40NTUuODA0LTcuODYxIDIuMjUxYy0yLjI0NyAxLjYwOC00LjAxMiAzLjY5OC01LjQ1NiA2LjI3Yy0xLjI4MyAyLjU3My0xLjkyNSA1LjYyOC0xLjkyNSA5LjAwNXMuNjQyIDYuNDMyIDEuOTI1IDkuMDA0YzEuMjg0IDIuNTczIDMuMjEgNC42NjMgNS40NTYgNi4yN2MyLjQwNiAxLjQ0OCA0Ljk3MyAyLjI1MiA3Ljg2MSAyLjI1Mm0zNy44NjYgMTIuNzAyVjU4LjY4NWgxNC43NmwuNDgyIDcuODc5YzEuNzY1LTIuODk1IDQuMTcxLTUuMTQ2IDcuMjItNi45MTRjMy4wNDgtMS43NjkgNi41NzgtMi41NzMgMTAuNTktMi41NzNjNC40OTIgMCA4LjM0MiAxLjEyNSAxMS41NTEgMy4yMTZjMy4zNyAyLjA5IDUuOTM3IDUuMTQ1IDcuNzAyIDkuMDA0czIuNzI3IDguNTIxIDIuNzI3IDEzLjgyOHYzNi4zMzhoLTE2LjA0NFY4NS4yMTVjMC00LjE4LS45NjMtNy41NTctMi44ODgtOS45N2MtMS45MjUtMi40MS00LjQ5My0zLjY5Ny03Ljg2Mi0zLjY5N2MtMi40MDcgMC00LjQ5My40ODItNi40MTggMS42MDhjLTEuNzY1IDEuMTI1LTMuMjA5IDIuNTcyLTQuMzMyIDQuNjYzYy0xLjEyMyAxLjkyOS0xLjYwNCA0LjM0LTEuNjA0IDYuNzUzdjM0Ljczem02My4wNTQgMHYtODUuNTRoMTYuMDQ1djMyLjY0YzIuMjQ2LTIuODkzIDQuODEzLTUuMTQ1IDguMDIyLTYuOTEzYzMuMjEtMS42MDggNi43NC0yLjU3MyAxMC43NS0yLjU3M3E2LjAxOCAwIDExLjA3MSAyLjQxMmMzLjM3IDEuNjA4IDYuMjU3IDMuODU5IDguODI0IDYuNzUzYzIuNTcgMi44OTQgNC40OTIgNi4yNzEgNS45MzggOS45N2MxLjQ0NiAzLjg1OCAyLjA4MyA4LjAzOCAyLjA4MyAxMi41NGMwIDQuNTAzLS43OTggOC44NDQtMi4yNDQgMTIuNzAzYy0xLjQ0NSAzLjg1OS0zLjUyOSA3LjIzNS02LjA5OSAxMC4yOWMtMi41NjYgMi44OTUtNS42MTQgNS4zMDYtOS4xNDQgNi45MTRzLTcuMjIgMi40MTItMTEuMzkxIDIuNDEyYy00LjAxMSAwLTcuNTQxLS44MDQtMTAuNzUtMi41NzNjLTMuMjEtMS42MDgtNS43NzYtNC4wMi03Ljg2Mi03LjA3NGwtLjQ4MSA3Ljg3OHptMzEuMTI3LTEyLjcwMmMyLjg4OCAwIDUuNDU1LS44MDQgNy44NjItMi4yNTFjMi4yNDYtMS42MDggNC4wMS0zLjY5OCA1LjQ1NS02LjI3YzEuMjg0LTIuNTczIDEuOTI2LTUuNjI4IDEuOTI2LTkuMDA1cy0uNjQyLTYuNDMyLTEuOTI2LTkuMDA0Yy0xLjI4My0yLjU3My0zLjIwOS00LjY2My01LjQ1NS02LjI3Yy0yLjI0Ny0xLjYwOS00Ljk3NC0yLjI1Mi03Ljg2Mi0yLjI1MnMtNS40NTUuODA0LTcuODYyIDIuMjUxYy0yLjI0NiAxLjYwOC00LjAxIDMuNjk4LTUuNDU1IDYuMjdjLTEuNDQ0IDMDU3My0xLjkyNiA1LjYyOC0xLjkyNiA5LjAwNXMuNjQzIDYuNDMyIDEuOTI2IDkuMDA0YzEuMjg0IDIuNTczIDMuMjEgNC42NjMgNS40NTUgNi4yN2MyLjQwNyAxLjQ0OCA0LjgxNCAyLjI1MiA3Ljg2MiAyLjI1MiIvPjwvc3ZnPg=="
              alt="Airbnb"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          
          {/* Belong Anywhere text */}
          <div style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Belong Anywhere
          </div>
        </div>
      );
    }
    
    // iPhone-style status bar
    const StatusBar = () => (
      <div style={{
        height: '44px',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontSize: '17px',
        fontWeight: '600',
        color: '#000'
      }}>
        <div>9:41</div>
        <div style={{ 
          background: '#000', 
          width: '128px', 
          height: '30px', 
          borderRadius: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '6px', height: '6px', background: '#4285f4', borderRadius: '50%' }}></div>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '16px' }}>
          <span>•••</span>
          <div style={{ width: '16px', height: '16px' }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48 1.3-.75-.85-1.48-1.3.75zm6.7-3.9L11 8.47l.85 1.48 1.3-.75-.85-1.48-1.3.75zm6.7-3.9L17 4.47l.85 1.48 1.3-.75-.85-1.48-1.3.75z"/>
            </svg>
          </div>
          <div style={{ width: '16px', height: '16px' }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33c0 .74.6 1.34 1.33 1.34h8.34c.73 0 1.33-.6 1.33-1.33V5.33C17 4.6 16.4 4 15.67 4zm-4 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
        </div>
      </div>
    );
    
    // Search header matching the screenshot
    const SearchHeader = () => (
      <div style={{
        padding: '16px',
        background: '#ffffff',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#000', marginBottom: '2px' }}>
              Joshua Tree
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Dec 11 - 14 • 2 guests
            </div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            border: '1px solid #ddd',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </div>
        </div>
      </div>
    );

    // Property card component matching the screenshot
    const PropertyCard = ({ title, subtitle, beds, price, rating, reviews, image, index, isGuestFavorite }: { 
      title: string; 
      subtitle: string; 
      beds: string; 
      price: string; 
      rating: string; 
      reviews: string; 
      image: string; 
      index: number;
      isGuestFavorite?: boolean;
    }) => {
      const adjustedFrame = frame - 90; // Adjust for logo screen
      const isHighlighted = adjustedFrame >= 60 && adjustedFrame < 120 && index === 0; // Highlight first property
      
      return (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px',
          transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            height: '320px',
            background: `url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            borderRadius: '12px'
          }}>
            {/* Guest favorite badge */}
            {isGuestFavorite && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'white',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#222'
              }}>
                Guest favorite
              </div>
            )}
            
            {/* Heart icon */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>

            {/* Photo dots indicator */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '4px'
            }}>
              {[1,2,3,4,5].map((_, i) => (
                <div key={i} style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i === 0 ? 'white' : 'rgba(255,255,255,0.5)'
                }}></div>
              ))}
            </div>
          </div>
          
          <div style={{ padding: '12px 0' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '4px'
            }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#222',
                lineHeight: '1.3'
              }}>
                {title}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '14px'
              }}>
                <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="#FFD700">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span style={{ fontWeight: '600' }}>{rating}</span>
                <span style={{ color: '#717171' }}>({reviews})</span>
              </div>
            </div>
            
            <div style={{
              fontSize: '15px',
              color: '#717171',
              marginBottom: '4px'
            }}>
              {subtitle}
            </div>
            
            <div style={{
              fontSize: '15px',
              color: '#717171',
              marginBottom: '8px'
            }}>
              {beds}
            </div>
            
            <div style={{
              fontSize: '15px',
              color: '#222'
            }}>
              <span style={{ fontWeight: '600', textDecoration: 'underline' }}>${price}</span>
              <span style={{ color: '#717171' }}> total before taxes</span>
            </div>
          </div>
        </div>
      );
    };

    // Bottom navigation
    const BottomNav = () => (
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '83px',
        background: '#ffffff',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '24px', height: '24px', marginBottom: '4px', margin: '0 auto' }}>
            <svg viewBox="0 0 24 24" fill="#FF385C">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          <div style={{ fontSize: '10px', color: '#FF385C', fontWeight: '600' }}>Explore</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '24px', height: '24px', marginBottom: '4px', margin: '0 auto' }}>
            <svg viewBox="0 0 24 24" fill="#717171">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div style={{ fontSize: '10px', color: '#717171' }}>Wishlists</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '24px', height: '24px', marginBottom: '4px', margin: '0 auto' }}>
            <svg viewBox="0 0 24 24" fill="#717171">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <div style={{ fontSize: '10px', color: '#717171' }}>Trips</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '24px', height: '24px', marginBottom: '4px', margin: '0 auto' }}>
            <svg viewBox="0 0 24 24" fill="#717171">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
          </div>
          <div style={{ fontSize: '10px', color: '#717171' }}>Inbox</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '24px', height: '24px', marginBottom: '4px', margin: '0 auto' }}>
            <svg viewBox="0 0 24 24" fill="#717171">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
            </svg>
          </div>
          <div style={{ fontSize: '10px', color: '#717171' }}>Profile</div>
        </div>
      </div>
    );

    // Scroll animation - adjusted for new timing
    const adjustedFrame = frame - 90; // Adjust for logo screen
    const scrollY = interpolate(
      adjustedFrame,
      [30, 90],
      [0, -200],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeInOut" }
    );

    // Properties data matching the screenshot
    const properties = [
      { 
        title: "Home in Yucca Valley", 
        subtitle: "Desert dream oasis with spa",
        beds: "2 beds",
        price: "782", 
        rating: "4.97", 
        reviews: "156",
        image: "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=400",
        isGuestFavorite: true
      },
      { 
        title: "Desert Modern Retreat", 
        subtitle: "Stunning views and modern amenities",
        beds: "3 beds",
        price: "425", 
        rating: "4.89", 
        reviews: "89",
        image: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400",
        isGuestFavorite: false
      }
    ];

    return (
      <div style={{
        width: '375px',
        height: '812px',
        background: '#ffffff',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <StatusBar />
        <SearchHeader />
        
        {/* Properties list with scroll animation */}
        <div style={{
          padding: '16px',
          paddingBottom: '100px',
          transform: `translateY(${scrollY}px)`,
          transition: 'transform 0.1s ease-out',
          height: '100%',
          overflowY: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0px'
          }}>
            {properties.map((property, index) => (
              <PropertyCard key={index} {...property} index={index} />
            ))}
          </div>
        </div>

        <BottomNav />

        {/* Booking overlay that appears when property is highlighted */}
        {adjustedFrame >= 90 && adjustedFrame < 150 && (
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '20px',
            right: '20px',
            background: '#ff5a5f',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            textAlign: 'center',
            animation: adjustedFrame < 105 ? 'slideUp 0.5s ease-out' : 'none'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              Reserve this place?
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              $782 × 3 nights = $2,346 total
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `
      }} />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '500px',
        padding: '20px',
        gap: '20px'
      }}>
        <AirbnbApp />
        <button
          onClick={togglePlayPause}
          style={{
            background: '#FF5A5F',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </>
  );
};

export default AirbnbVideoPlayer; 