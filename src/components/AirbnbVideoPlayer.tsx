"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import airbnbIcon from '@iconify-icons/logos/airbnb';

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
        setCurrentFrame(prev => (prev + 1) % 600); // 20 seconds at 30fps
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

  const BookingPage: React.FC<{ frame: number }> = ({ frame }) => {
    const adjustedFrame = frame - 420; // Adjust for when this page starts

    return (
      <div style={{
        width: '390px',
        height: '844px',
        background: '#000',
        borderRadius: '40px',
        padding: '8px',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          borderRadius: '32px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '126px',
            height: '37px',
            background: '#000',
            borderRadius: '19px',
            zIndex: 100
          }} />

          {/* Status bar */}
          <div style={{
            height: '44px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            fontSize: '17px',
            fontWeight: '600',
            color: '#000',
            paddingTop: '10px'
          }}>
            <div>4:04</div>
            <div></div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', fontSize: '16px' }}>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'end', height: '12px' }}>
                <div style={{ width: '3px', height: '3px', background: '#000', borderRadius: '0.5px' }}></div>
                <div style={{ width: '3px', height: '6px', background: '#000', borderRadius: '0.5px' }}></div>
                <div style={{ width: '3px', height: '9px', background: '#000', borderRadius: '0.5px' }}></div>
                <div style={{ width: '3px', height: '12px', background: '#000', borderRadius: '0.5px' }}></div>
              </div>
              <div style={{ width: '15px', height: '15px' }}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3C6.686 3 3.686 4.342 1.582 6.582L2.996 8.004C4.634 6.362 7.134 5.5 10 5.5s5.366.862 7.004 2.504l1.414-1.422C16.314 4.342 13.314 3 10 3zm0 4c-2.209 0-4.209.672-5.586 1.918l1.414 1.414C6.791 9.475 8.291 9 10 9s3.209.475 4.172 1.332l1.414-1.414C14.209 7.672 12.209 7 10 7zm0 4c-1.105 0-2.105.336-2.879.904L10 14.5l2.879-2.596C12.105 11.336 11.105 11 10 11zm0 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                </svg>
              </div>
              <div style={{ width: '24px', height: '12px', position: 'relative' }}>
                <div style={{
                  width: '22px',
                  height: '11px',
                  border: '1px solid #000',
                  borderRadius: '2px',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: '#000',
                    borderRadius: '1px'
                  }}></div>
                </div>
                <div style={{
                  position: 'absolute',
                  right: '-2px',
                  top: '3px',
                  width: '1px',
                  height: '5px',
                  background: '#000',
                  borderRadius: '0 1px 1px 0'
                }}></div>
              </div>
            </div>
          </div>

          {/* Header */}
          <div style={{
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#222',
              margin: 0
            }}>
              Review and continue
            </h1>
            <div style={{
              width: '24px',
              height: '24px',
              cursor: 'pointer'
            }}>
              <svg viewBox="0 0 24 24" fill="#717171">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
          </div>

          {/* Property Card */}
          <div style={{
            margin: '0 24px 32px',
            background: '#f7f7f7',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            gap: '16px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              background: 'url(https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}></div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#222',
                margin: '0 0 4px 0'
              }}>
                Apartment Les Gets, 1 bedroom, 4 pers.
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{
                  background: '#222',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  ★ New
                </div>
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div style={{
            margin: '0 24px 32px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#222',
                margin: 0
              }}>
                Trip details
              </h3>
              <button style={{
                background: '#f7f7f7',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Change
              </button>
            </div>
            <div style={{
              fontSize: '16px',
              color: '#222',
              marginBottom: '4px'
            }}>
              Jul 18 – 28, 2025
            </div>
            <div style={{
              fontSize: '16px',
              color: '#222'
            }}>
              1 adult
            </div>
          </div>

          {/* Total Price */}
          <div style={{
            margin: '0 24px 24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#222',
                margin: 0
              }}>
                Total price
              </h3>
              <button style={{
                background: '#f7f7f7',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Details
              </button>
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#222',
              marginBottom: '16px'
            }}>
              € 962.00 including taxes <span style={{ textDecoration: 'underline' }}>EUR</span>
            </div>
            <div style={{
              fontSize: '14px',
              color: '#717171'
            }}>
              This reservation is non-refundable. <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Full policy</span>
            </div>
          </div>

          {/* Payment Options */}
          <div style={{
            margin: '0 24px 32px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#222',
              margin: '0 0 16px 0'
            }}>
              Choose when to pay
            </h3>
            
            {/* Pay now option */}
            <div style={{
              border: '2px solid #222',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#222'
              }}>
                Pay € 962.00 now
              </div>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'white'
                }}></div>
              </div>
            </div>

            {/* Klarna option */}
            <div style={{
              border: '1px solid #dddddd',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#222',
                  marginBottom: '4px'
                }}>
                  Pay in 3 payments with Klarna
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#717171'
                }}>
                  Split your purchase into 3 payments of €<br />
                  320.66 (0% APR). <span style={{ textDecoration: 'underline' }}>More info</span>
                </div>
              </div>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid #dddddd',
                marginLeft: '16px',
                marginTop: '2px'
              }}></div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            position: 'absolute',
            bottom: '120px',
            left: '24px',
            right: '24px',
            height: '4px',
            background: '#f0f0f0',
            borderRadius: '2px'
          }}>
            <div style={{
              width: '25%',
              height: '100%',
              background: '#222',
              borderRadius: '2px'
            }}></div>
          </div>

          {/* Next Button */}
          <div style={{
            position: 'absolute',
            bottom: '50px',
            left: '24px',
            right: '24px'
          }}>
            <button style={{
              width: '100%',
              background: '#222',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Next
            </button>
          </div>

          {/* Home Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '134px',
            height: '5px',
            background: '#000',
            borderRadius: '3px',
            opacity: 0.3
          }} />
        </div>
      </div>
    );
  };

  const ProductDetailPage: React.FC<{ frame: number }> = ({ frame }) => {
    const adjustedFrame = frame - 240; // Adjust for when this page starts
    
    // Scroll animation for the detail page
    const detailScrollY = interpolate(
      adjustedFrame,
      [60, 180],
      [0, -800],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeInOut" }
    );

    // Reserve button click effect
    const isReserveClicked = frame >= 390 && frame < 420;

    return (
      <div style={{
        width: '390px',
        height: '844px',
        background: '#000',
        borderRadius: '40px',
        padding: '8px',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          borderRadius: '32px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '126px',
            height: '37px',
            background: '#000',
            borderRadius: '19px',
            zIndex: 100
          }} />

          {/* Status bar */}
          <div style={{
            height: '44px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            fontSize: '17px',
            fontWeight: '600',
            color: '#fff',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 90,
            paddingTop: '10px'
          }}>
            <div>9:41</div>
            <div></div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', fontSize: '16px' }}>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'end', height: '12px' }}>
                <div style={{ width: '3px', height: '3px', background: '#fff', borderRadius: '0.5px' }}></div>
                <div style={{ width: '3px', height: '6px', background: '#fff', borderRadius: '0.5px' }}></div>
                <div style={{ width: '3px', height: '9px', background: '#fff', borderRadius: '0.5px' }}></div>
                <div style={{ width: '3px', height: '12px', background: '#fff', borderRadius: '0.5px' }}></div>
              </div>
              <div style={{ width: '15px', height: '15px' }}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3C6.686 3 3.686 4.342 1.582 6.582L2.996 8.004C4.634 6.362 7.134 5.5 10 5.5s5.366.862 7.004 2.504l1.414-1.422C16.314 4.342 13.314 3 10 3zm0 4c-2.209 0-4.209.672-5.586 1.918l1.414 1.414C6.791 9.475 8.291 9 10 9s3.209.475 4.172 1.332l1.414-1.414C14.209 7.672 12.209 7 10 7zm0 4c-1.105 0-2.105.336-2.879.904L10 14.5l2.879-2.596C12.105 11.336 11.105 11 10 11zm0 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                </svg>
              </div>
              <div style={{ width: '24px', height: '12px', position: 'relative' }}>
                <div style={{
                  width: '22px',
                  height: '11px',
                  border: '1px solid #fff',
                  borderRadius: '2px',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: '#fff',
                    borderRadius: '1px'
                  }}></div>
                </div>
                <div style={{
                  position: 'absolute',
                  right: '-2px',
                  top: '3px',
                  width: '1px',
                  height: '5px',
                  background: '#fff',
                  borderRadius: '0 1px 1px 0'
                }}></div>
              </div>
            </div>
          </div>

          {/* Top Navigation */}
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px',
            zIndex: 80
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="#000">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="#000">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div style={{
            transform: `translateY(${detailScrollY}px)`,
            transition: 'transform 0.1s ease-out'
          }}>
            {/* Main Image */}
            <div style={{
              height: '375px',
              background: 'url(https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }}>
              {/* Photo counter */}
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                3 / 42
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Title */}
              <h1 style={{
                fontSize: '26px',
                fontWeight: '600',
                color: '#222',
                margin: '0 0 8px 0',
                lineHeight: '1.2'
              }}>
                Desert dream oasis with spa
              </h1>

              {/* Location */}
              <div style={{
                fontSize: '16px',
                color: '#717171',
                marginBottom: '8px'
              }}>
                Entire home in Yucca Valley, California
              </div>

              {/* Details */}
              <div style={{
                fontSize: '16px',
                color: '#717171',
                marginBottom: '24px'
              }}>
                4 guests • 2 bedrooms • 2 beds • 1 bath
              </div>

              {/* Rating and Reviews */}
              <div style={{
                background: '#f7f7f7',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>4.97</div>
                  <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ fontSize: '12px' }}>★</div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '0 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="#FF385C">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>Guest</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>favorite</div>
                    </div>
                    <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="#FF385C">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>156</div>
                  <div style={{ fontSize: '14px', color: '#717171', textDecoration: 'underline' }}>Reviews</div>
                </div>
              </div>

              {/* Host Section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'url(https://images.unsplash.com/photo-1494790108755-2616b612b1-1c35-32f1-be1d-b90e88cbaa18d5f?w=200)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  marginRight: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    background: '#FF385C',
                    borderRadius: '50%',
                    border: '2px solid white'
                  }}></div>
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>
                    Hosted by Jessica
                  </div>
                  <div style={{ fontSize: '16px', color: '#717171' }}>
                    Superhost • 2 years hosting
                  </div>
                </div>
              </div>

              {/* Self Check-in */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                marginBottom: '32px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  marginTop: '4px'
                }}>
                  <svg viewBox="0 0 24 24" fill="#000">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    Self check-in
                  </div>
                  <div style={{ fontSize: '16px', color: '#717171' }}>
                    Check yourself in with the smart lock.
                  </div>
                </div>
              </div>

                             {/* Reviews Section */}
               <div style={{
                 background: '#f7f7f7',
                 borderRadius: '12px',
                 padding: '32px 24px',
                 marginBottom: '24px',
                 textAlign: 'center'
               }}>
                 {/* Large Rating with Decorative Elements */}
                 <div style={{
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   marginBottom: '16px',
                   gap: '24px'
                 }}>
                   {/* Left decorative wreath */}
                   <div>
                     <svg width={50} height={80} viewBox="0 0 50 80" fill="none">
                       <path d="M8 20C8 16 10 12 14 10C18 8 22 10 24 14C26 18 24 22 20 24C16 26 12 24 10 20C8 24 6 28 8 32C10 36 14 38 18 36C22 34 24 30 22 26C20 22 16 20 12 22C8 24 6 28 8 32C10 36 14 38 18 36C22 34 24 30 22 26C24 30 28 32 32 30C36 28 38 24 36 20C34 16 30 14 26 16C22 18 20 22 22 26C24 30 28 32 32 30C36 28 38 24 36 20" 
                             stroke="#8B8B8B" 
                             strokeWidth="1.5" 
                             fill="none"/>
                       <ellipse cx="12" cy="18" rx="3" ry="6" fill="#8B8B8B" transform="rotate(-20 12 18)"/>
                       <ellipse cx="18" cy="28" rx="2.5" ry="5" fill="#8B8B8B" transform="rotate(-10 18 28)"/>
                       <ellipse cx="24" cy="38" rx="2" ry="4" fill="#8B8B8B" transform="rotate(5 24 38)"/>
                       <ellipse cx="28" cy="48" rx="1.5" ry="3" fill="#8B8B8B" transform="rotate(15 28 48)"/>
                     </svg>
                   </div>
                   
                   {/* Main Rating */}
                   <div style={{
                     fontSize: '80px',
                     fontWeight: '600',
                     color: '#222',
                     lineHeight: '1'
                   }}>
                     4.97
                   </div>
                   
                   {/* Right decorative wreath */}
                   <div style={{ transform: 'scaleX(-1)' }}>
                     <svg width={50} height={80} viewBox="0 0 50 80" fill="none">
                       <path d="M8 20C8 16 10 12 14 10C18 8 22 10 24 14C26 18 24 22 20 24C16 26 12 24 10 20C8 24 6 28 8 32C10 36 14 38 18 36C22 34 24 30 22 26C20 22 16 20 12 22C8 24 6 28 8 32C10 36 14 38 18 36C22 34 24 30 22 26C24 30 28 32 32 30C36 28 38 24 36 20C34 16 30 14 26 16C22 18 20 22 22 26C24 30 28 32 32 30C36 28 38 24 36 20" 
                             stroke="#8B8B8B" 
                             strokeWidth="1.5" 
                             fill="none"/>
                       <ellipse cx="12" cy="18" rx="3" ry="6" fill="#8B8B8B" transform="rotate(-20 12 18)"/>
                       <ellipse cx="18" cy="28" rx="2.5" ry="5" fill="#8B8B8B" transform="rotate(-10 18 28)"/>
                       <ellipse cx="24" cy="38" rx="2" ry="4" fill="#8B8B8B" transform="rotate(5 24 38)"/>
                       <ellipse cx="28" cy="48" rx="1.5" ry="3" fill="#8B8B8B" transform="rotate(15 28 48)"/>
                     </svg>
                   </div>
                 </div>
                 
                 <div style={{
                   fontSize: '18px',
                   fontWeight: '600',
                   color: '#222',
                   marginBottom: '8px'
                 }}>
                   Guest favorite
                 </div>
                 
                 <div style={{
                   fontSize: '15px',
                   color: '#717171',
                   lineHeight: '1.4',
                   maxWidth: '280px',
                   margin: '0 auto'
                 }}>
                   One of the most loved homes on Airbnb<br />
                   based on ratings, reviews, and reliability
                 </div>
               </div>

               {/* Rating Breakdown */}
               <div style={{
                 display: 'grid',
                 gridTemplateColumns: '1fr 1fr 1fr',
                 gap: '24px',
                 marginBottom: '32px'
               }}>
                 <div>
                   <div style={{ marginBottom: '16px' }}>
                     <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', textAlign: 'left' }}>Overall rating</div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                       {[5,4,3,2,1].map(rating => (
                         <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#717171' }}>
                           <span style={{ width: '8px' }}>{rating}</span>
                           <div style={{
                             width: '80px',
                             height: '3px',
                             background: '#e0e0e0',
                             borderRadius: '2px',
                             overflow: 'hidden'
                           }}>
                             <div style={{
                               width: rating === 5 ? '100%' : rating === 4 ? '8%' : '3%',
                               height: '100%',
                               background: '#222',
                               borderRadius: '2px'
                             }}></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
                 
                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>5.0</div>
                   <div style={{ fontSize: '14px', color: '#717171', marginBottom: '8px' }}>Cleanliness</div>
                   <div style={{
                     width: '24px',
                     height: '24px',
                     margin: '0 auto'
                   }}>
                     <svg viewBox="0 0 24 24" fill="none" stroke="#717171" strokeWidth="2">
                       <path d="M8 2C6.9 2 6 2.9 6 4V8C6 9.1 6.9 10 8 10C9.1 10 10 9.1 10 8V4C10 2.9 9.1 2 8 2Z"/>
                       <path d="M8 10L16 18"/>
                       <path d="M16 14L20 18"/>
                       <circle cx="16" cy="16" r="2"/>
                     </svg>
                   </div>
                 </div>
                 
                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>5.0</div>
                   <div style={{ fontSize: '14px', color: '#717171', marginBottom: '8px' }}>Accuracy</div>
                   <div style={{
                     width: '24px',
                     height: '24px',
                     margin: '0 auto'
                   }}>
                     <svg viewBox="0 0 24 24" fill="none" stroke="#717171" strokeWidth="2">
                       <circle cx="12" cy="12" r="10"/>
                       <path d="m9 12 2 2 4-4"/>
                     </svg>
                   </div>
                 </div>
               </div>

               {/* Second Row of Categories */}
               <div style={{
                 display: 'grid',
                 gridTemplateColumns: '1fr 1fr 1fr',
                 gap: '24px',
                 marginBottom: '32px'
               }}>
                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>5.0</div>
                   <div style={{ fontSize: '14px', color: '#717171', marginBottom: '8px' }}>Check-in</div>
                   <div style={{
                     width: '24px',
                     height: '24px',
                     margin: '0 auto'
                   }}>
                     <svg viewBox="0 0 24 24" fill="none" stroke="#717171" strokeWidth="2">
                       <circle cx="8" cy="8" r="6"/>
                       <path d="M16 16L22 22"/>
                       <circle cx="8" cy="8" r="2"/>
                     </svg>
                   </div>
                 </div>
                 <div></div>
                 <div></div>
               </div>

               {/* Reviews Header */}
               <div style={{
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 marginBottom: '16px'
               }}>
                 <h2 style={{
                   fontSize: '22px',
                   fontWeight: '600',
                   color: '#222',
                   margin: 0
                 }}>
                   156 reviews
                 </h2>
                                    <button style={{
                     background: '#f7f7f7',
                     border: '1px solid #dddddd',
                     borderRadius: '20px',
                     padding: '8px 16px',
                     fontSize: '14px',
                     fontWeight: '600',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px',
                     cursor: 'pointer'
                   }}>
                     Highest rated
                     <svg width={12} height={12} viewBox="0 0 24 24" fill="#717171">
                       <path d="M7 10l5 5 5-5z"/>
                     </svg>
                   </button>
               </div>

               {/* Search Reviews */}
               <div style={{
                 background: '#f7f7f7',
                 borderRadius: '25px',
                 padding: '12px 16px',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '12px',
                 marginBottom: '24px'
               }}>
                 <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="#717171">
                   <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                 </svg>
                 <div style={{
                   fontSize: '16px',
                   color: '#717171',
                   flex: 1
                 }}>
                   Search all reviews
                 </div>
               </div>

               {/* Individual Review */}
               <div style={{
                 marginBottom: '24px'
               }}>
                 <div style={{
                   display: 'flex',
                   alignItems: 'center',
                   gap: '12px',
                   marginBottom: '12px'
                 }}>
                   <div style={{
                     width: '48px',
                     height: '48px',
                     borderRadius: '50%',
                     background: 'url(https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200)',
                     backgroundSize: 'cover',
                     backgroundPosition: 'center'
                   }}></div>
                   <div>
                     <div style={{
                       fontSize: '16px',
                       fontWeight: '600',
                       color: '#222',
                       marginBottom: '2px'
                     }}>
                       Allison
                     </div>
                     <div style={{
                       fontSize: '14px',
                       color: '#717171'
                     }}>
                       Oak Ridge North, TX
                     </div>
                   </div>
                 </div>
                 
                 <div style={{
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px',
                   marginBottom: '12px'
                 }}>
                   <div style={{ display: 'flex', gap: '1px' }}>
                     {[1,2,3,4,5].map(i => (
                       <span key={i} style={{ fontSize: '14px' }}>★</span>
                     ))}
                   </div>
                   <span style={{ fontSize: '14px', color: '#717171' }}>7 months ago</span>
                   <span style={{ fontSize: '14px', color: '#717171' }}>•</span>
                   <span style={{ fontSize: '14px', color: '#717171' }}>Stayed with kids</span>
                 </div>
                 
                 <div style={{
                   fontSize: '16px',
                   color: '#222',
                   lineHeight: '1.5'
                 }}>
                   A little gem in the middle of the desert! We loved the seclusion and privacy that came with it. We saw some quail and a jackrabbit while lounging by the fire too. It's always fun to see the wildlife right from your patio!
                 </div>
               </div>

               {/* Add more space for additional scrolling */}
               <div style={{ height: '200px' }}></div>
            </div>
          </div>

          {/* Bottom Price/Reserve Section */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '100px',
            background: '#fff',
            borderTop: '1px solid #DDDDDD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px 32px 24px'
          }}>
            <div>
              <div style={{
                fontSize: '22px',
                fontWeight: '600',
                color: '#222',
                marginBottom: '4px'
              }}>
                $782
              </div>
              <div style={{
                fontSize: '16px',
                color: '#717171',
                textDecoration: 'underline'
              }}>
                Total before taxes
              </div>
              <div style={{
                fontSize: '16px',
                color: '#717171',
                fontWeight: '600'
              }}>
                Dec 11 – 14
              </div>
            </div>
            <button style={{
              background: isReserveClicked ? '#C4183F' : '#E51E53',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transform: isReserveClicked ? 'scale(0.95)' : 'scale(1)',
              transition: 'all 0.1s ease'
            }}>
              Reserve
            </button>
          </div>

          {/* Home Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '134px',
            height: '5px',
            background: '#000',
            borderRadius: '3px',
            opacity: 0.3
          }} />
        </div>
      </div>
    );
  };

  const AirbnbApp: React.FC = () => {
    const frame = currentFrame;
    
    // Show logo screen for first 90 frames (3 seconds)
    if (frame < 90) {
      // Logo scale animation: 0% to 100% over first 15 frames (500ms)
      const logoScale = interpolate(
        frame,
        [0, 15],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
      );

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
          
          {/* Airbnb logo with scale animation */}
          <div style={{
            width: '80%',
            maxWidth: '280px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            transform: `scale(${logoScale})`
          }}>
            {/* Airbnb logo from iconify with white color override */}
            <Icon 
              icon={airbnbIcon} 
              style={{ 
                fontSize: '120px',
                color: 'white',
                // Override any internal colors to white
                filter: 'brightness(0) invert(1)'
              }} 
            />
          </div>
          
          {/* Belong Anywhere text */}
          <div style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            textAlign: 'center',
            transform: `scale(${logoScale})`
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
        color: '#000',
        position: 'relative',
        zIndex: 50,
        paddingTop: '10px' // Account for Dynamic Island
      }}>
        <div>9:41</div>
        {/* Removed duplicate center element - using Dynamic Island instead */}
        <div></div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', fontSize: '16px' }}>
          {/* Signal Strength - 4 bars iOS style */}
          <div style={{ display: 'flex', gap: '2px', alignItems: 'end', height: '12px' }}>
            <div style={{ width: '3px', height: '3px', background: '#000', borderRadius: '0.5px' }}></div>
            <div style={{ width: '3px', height: '6px', background: '#000', borderRadius: '0.5px' }}></div>
            <div style={{ width: '3px', height: '9px', background: '#000', borderRadius: '0.5px' }}></div>
            <div style={{ width: '3px', height: '12px', background: '#000', borderRadius: '0.5px' }}></div>
          </div>
          
          {/* WiFi Icon - iOS style */}
          <div style={{ width: '15px', height: '15px' }}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3C6.686 3 3.686 4.342 1.582 6.582L2.996 8.004C4.634 6.362 7.134 5.5 10 5.5s5.366.862 7.004 2.504l1.414-1.422C16.314 4.342 13.314 3 10 3zm0 4c-2.209 0-4.209.672-5.586 1.918l1.414 1.414C6.791 9.475 8.291 9 10 9s3.209.475 4.172 1.332l1.414-1.414C14.209 7.672 12.209 7 10 7zm0 4c-1.105 0-2.105.336-2.879.904L10 14.5l2.879-2.596C12.105 11.336 11.105 11 10 11zm0 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
            </svg>
          </div>
          
          {/* Battery Icon - iOS style with 100% fill */}
          <div style={{ width: '24px', height: '12px', position: 'relative' }}>
            {/* Battery outline */}
            <div style={{
              width: '22px',
              height: '11px',
              border: '1px solid #000',
              borderRadius: '2px',
              position: 'relative'
            }}>
              {/* Battery fill (100%) */}
              <div style={{
                width: '100%',
                height: '100%',
                background: '#000',
                borderRadius: '1px'
              }}></div>
            </div>
            {/* Battery tip */}
            <div style={{
              position: 'absolute',
              right: '-2px',
              top: '3px',
              width: '1px',
              height: '5px',
              background: '#000',
              borderRadius: '0 1px 1px 0'
            }}></div>
          </div>
        </div>
      </div>
    );
    
    // Search header matching the screenshot
    const SearchHeader = () => (
      <div style={{
        padding: '16px',
        background: '#ffffff',
        position: 'relative',
        zIndex: 40
      }}>
        {/* Rounded search container */}
        <div style={{
          background: '#f7f7f7',
          borderRadius: '25px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {/* Search icon */}
          <div style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="#000">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          
          {/* Text content */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#000', 
              marginBottom: '2px',
              lineHeight: '1.2'
            }}>
              Joshua Tree
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#717171',
              lineHeight: '1.2'
            }}>
              Dec 11 - 14 • 2 guests
            </div>
          </div>
          
          {/* Filter icon */}
          <div style={{
            width: '32px',
            height: '32px',
            border: '1px solid #dddddd',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff'
          }}>
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="#717171">
              <path d="M7 6h10l-5.01 6.3L7 6zm-2.75-.39C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.73-4.8 5.75-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61z"/>
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
      const isTapped = adjustedFrame >= 120 && adjustedFrame < 150 && index === 0; // Tap animation
      
      return (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px',
          transform: isTapped ? 'scale(0.98)' : (isHighlighted ? 'scale(1.02)' : 'scale(1)'),
          transition: 'all 0.3s ease',
          opacity: isTapped ? 0.7 : 1
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

    // Show booking page after frame 420 (14 seconds)
    if (frame >= 420) {
      return <BookingPage frame={frame} />;
    }

    // Show product detail page after frame 240 (8 seconds)
    if (frame >= 240) {
      return <ProductDetailPage frame={frame} />;
    }

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
        width: '390px',
        height: '844px',
        background: '#000',
        borderRadius: '40px',
        padding: '8px',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* iPhone Frame */}
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          borderRadius: '32px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '126px',
            height: '37px',
            background: '#000',
            borderRadius: '19px',
            zIndex: 100
          }} />
          
          {/* Fixed Header Area */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 60,
            background: '#ffffff'
          }}>
            <StatusBar />
            <SearchHeader />
          </div>
          
          {/* Scrollable Properties Content */}
          <div style={{
            flex: 1,
            overflowY: 'hidden',
            paddingBottom: '100px'
          }}>
            <div style={{
              padding: '16px',
              transform: `translateY(${scrollY}px)`,
              transition: 'transform 0.1s ease-out'
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
          </div>

          <BottomNav />
          
          {/* Home Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '134px',
            height: '5px',
            background: '#000',
            borderRadius: '3px',
            opacity: 0.3
          }} />
        </div>
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