import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import {
  Camera,
  CameraOff,
  Sparkles,
  Activity,
  Sliders,
  Download,
  Trash2,
  ScanFace,
  AlertTriangle,
  Users,
  Upload,
  RefreshCw,
  Lock,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { MoodChatbot } from './MoodChatbot';
import { MoodPlaylist } from './MoodPlaylist';

export interface EmotionScore {
  emotion: string;
  label: string;
  emoji: string;
  score: number; // 0 to 1
  color: string;
}

export interface EmotionSnapshot {
  id: string;
  dataUrl: string;
  dominantEmotion: string;
  emoji: string;
  confidence: number;
  age?: number;
  gender?: string;
  timestamp: string;
}

interface EmotionTimelinePoint {
  time: string;
  happy: number;
  neutral: number;
  surprised: number;
  sad: number;
  angry: number;
}

const EMOTION_META: Record<string, { label: string; emoji: string; color: string; desc: string }> = {
  happy: { label: 'Happy', emoji: '😊', color: '#10b981', desc: 'Positive, energetic, and joyful mood detected.' },
  neutral: { label: 'Neutral', emoji: '😐', color: '#3b82f6', desc: 'Calm, focused, and balanced demeanor.' },
  surprised: { label: 'Surprised', emoji: '😲', color: '#f59e0b', desc: 'Alert, intrigued, or astonished expression.' },
  sad: { label: 'Sad', emoji: '😢', color: '#6366f1', desc: 'Subdued, contemplative, or downcast state.' },
  angry: { label: 'Angry', emoji: '😠', color: '#ef4444', desc: 'Frustrated, stern, or tense facial cues.' },
  fearful: { label: 'Fearful', emoji: '😨', color: '#ec4899', desc: 'Heightened anxiety or startle response.' },
  disgusted: { label: 'Disgusted', emoji: '🤢', color: '#14b8a6', desc: 'Aversion, disapproval, or distaste.' },
};

export const EmotionDetectionView: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);

  // Stabilize onShowToast
  const onShowToastRef = useRef(onShowToast);
  useEffect(() => {
    onShowToastRef.current = onShowToast;
  }, [onShowToast]);

  // States
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [modelLoadingError, setModelLoadingError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [permissionErrorMsg, setPermissionErrorMsg] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Demo Simulation Mode
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Live Detection Telemetry
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(0);
  const [dominantEmotion, setDominantEmotion] = useState<{ emotion: string; label: string; emoji: string; score: number; color: string }>({
    emotion: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    score: 0.95,
    color: '#3b82f6',
  });
  const [emotionScores, setEmotionScores] = useState<EmotionScore[]>([]);
  const [estimatedAge, setEstimatedAge] = useState<number | null>(null);
  const [estimatedGender, setEstimatedGender] = useState<string | null>(null);
  const [attentionScore, setAttentionScore] = useState<number>(85); // 0-100%
  const [smileScore, setSmileScore] = useState<number>(0); // 0-100%

  // Overlay Settings
  const [showFaceBox, setShowFaceBox] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showEmotionTag, setShowEmotionTag] = useState<boolean>(true);
  const [detectionConfidenceThreshold, setDetectionConfidenceThreshold] = useState<number>(0.35);

  // Live Graph Timeline
  const [timelineData, setTimelineData] = useState<EmotionTimelinePoint[]>([]);

  // Snapshots Gallery
  const [snapshots, setSnapshots] = useState<EmotionSnapshot[]>([]);

  // FPS tracking & Animation refs
  const [fps, setFps] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(Date.now());
  const animationFrameIdRef = useRef<number | null>(null);
  const demoIntervalRef = useRef<any>(null);

  // Stream & Lifecycle control refs
  const activeStreamRef = useRef<MediaStream | null>(null);
  const userManuallyStoppedRef = useRef<boolean>(false);
  const hasAutoStartedRef = useRef<boolean>(false);
  const cameraActiveRef = useRef<boolean>(false);

  // Keep cameraActiveRef in sync with cameraActive state
  useEffect(() => {
    cameraActiveRef.current = cameraActive;
  }, [cameraActive]);

  // ── DYNAMIC MOOD THEME ──────────────────────────────────────────
  // Update the document's data-mood attribute so CSS variables auto-update
  useEffect(() => {
    const emotion = dominantEmotion.emotion || 'neutral';
    if (cameraActive || isDemoMode) {
      document.documentElement.setAttribute('data-mood', emotion);
    } else {
      document.documentElement.removeAttribute('data-mood');
    }
    // Cleanup: remove mood theme when this view unmounts
    return () => {
      document.documentElement.removeAttribute('data-mood');
    };
  }, [dominantEmotion.emotion, cameraActive, isDemoMode]);

  // 1. Load Face-API models from /models with CDN fallback
  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        if (isMounted) {
          setModelsLoaded(true);
        }
      } catch (localErr) {
        console.warn('Local /models load failed, attempting CDN fallback...', localErr);
        try {
          const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(CDN_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(CDN_URL),
            faceapi.nets.ageGenderNet.loadFromUri(CDN_URL),
          ]);
          if (isMounted) {
            setModelsLoaded(true);
          }
        } catch (cdnErr: any) {
          console.error('All model loading attempts failed:', cdnErr);
          if (isMounted) {
            setModelLoadingError(cdnErr?.message || 'Failed to load neural models');
          }
        }
      }
    };

    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Enumerate Video Input Devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch {
        // Ignore device listing error
      }
    };
    getDevices();
  }, [selectedDeviceId]);

  // 3. Stop Camera Stream & Completely release hardware
  const stopCamera = useCallback(() => {
    userManuallyStoppedRef.current = true;
    cameraActiveRef.current = false;

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setCameraActive(false);
    setIsDemoMode(false);
    setDetectedFacesCount(0);
    onShowToastRef.current('Camera turned off.');
  }, []);

  // Cleanup ONLY on component unmount
  useEffect(() => {
    return () => {
      cameraActiveRef.current = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        activeStreamRef.current = null;
      }
    };
  }, []);

  // 4. Start Camera Stream
  const startCamera = useCallback(async (deviceId?: string) => {
    userManuallyStoppedRef.current = false;
    setCameraLoading(true);
    setPermissionDenied(false);
    setPermissionErrorMsg('');
    setIsDemoMode(false);

    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }

    // Clean up existing stream
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    let stream: MediaStream | null = null;

    // Level 1: Preferred resolution
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user',
        },
        audio: false,
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err1: any) {
      console.warn('Level 1 camera constraints failed, attempting fallback...', err1);
      // Level 2: Basic fallback
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err2: any) {
        console.error('Camera access failed:', err2);
        setPermissionDenied(true);
        setPermissionErrorMsg(
          err2?.name === 'NotAllowedError'
            ? 'Camera permission was blocked by your browser.'
            : err2?.name === 'NotFoundError'
            ? 'No camera hardware device found on this system.'
            : err2?.message || 'Camera is not accessible.'
        );
        setCameraLoading(false);
        onShowToastRef.current('⚠️ Camera permission denied. Check instructions below.');
        return;
      }
    }

    if (stream && videoRef.current) {
      activeStreamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      video.onloadedmetadata = async () => {
        try {
          await video.play();
          setCameraActive(true);
          cameraActiveRef.current = true;
          setPermissionDenied(false);
          setCameraLoading(false);
          onShowToastRef.current('Live AI Camera stream started!');
        } catch (playErr) {
          console.error('Video play error onloadedmetadata:', playErr);
          setCameraLoading(false);
        }
      };
    } else {
      setCameraLoading(false);
    }
  }, [selectedDeviceId]);

  // Auto-start camera ONCE when models are loaded on initial tab mount
  useEffect(() => {
    if (modelsLoaded && !hasAutoStartedRef.current && !userManuallyStoppedRef.current) {
      hasAutoStartedRef.current = true;
      startCamera();
    }
  }, [modelsLoaded, startCamera]);

  // 5. Main Real-time Detection Loop
  const runDetectionLoop = useCallback(async () => {
    if (!cameraActiveRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.paused || video.ended || video.readyState < 2 || video.videoWidth === 0) {
      if (cameraActiveRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(runDetectionLoop);
      }
      return;
    }

    // Match canvas dimensions to video feed
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.25 }))
        .withFaceLandmarks(true)
        .withFaceExpressions()
        .withAgeAndGender();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update Face Count
        setDetectedFacesCount(resizedDetections.length);

        if (resizedDetections.length > 0) {
          const primaryFace = resizedDetections[0];
          const rawExp = primaryFace.expressions;
          const landmarks = primaryFace.landmarks?.positions;
          const box = primaryFace.detection.box;

          // Compute Geometric Landmark Telemetry
          let smileBoost = 0;
          let surpriseBoost = 0;
          let angryBoost = 0;
          let sadBoost = 0;

          if (landmarks && landmarks.length >= 68 && box.height > 0) {
            const p0 = landmarks[0];
            const p16 = landmarks[16];
            const p19 = landmarks[19];
            const p21 = landmarks[21];
            const p22 = landmarks[22];
            const p24 = landmarks[24];
            const p37 = landmarks[37];
            const p44 = landmarks[44];
            const p48 = landmarks[48]; // left mouth corner
            const p51 = landmarks[51]; // top lip center
            const p54 = landmarks[54]; // right mouth corner
            const p57 = landmarks[57]; // bottom lip center

            const jawW = Math.hypot(p16.x - p0.x, p16.y - p0.y) || box.width;
            const mouthW = Math.hypot(p54.x - p48.x, p54.y - p48.y) || 1;
            const mouthCornerAvgY = (p48.y + p54.y) / 2;
            const lipCenterAvgY = (p51.y + p57.y) / 2;
            const mouthOpenH = Math.abs(p57.y - p51.y);

            const smileCurvature = (lipCenterAvgY - mouthCornerAvgY) / box.height;
            const mouthOpenRatio = mouthOpenH / mouthW;
            const browLift = ((p37.y - p19.y) + (p44.y - p24.y)) / (2 * box.height);
            const innerBrowSpacing = Math.abs(p22.x - p21.x) / jawW;

            // Smile trigger
            if (smileCurvature > 0.008 || (mouthW / jawW) > 0.44 || (rawExp.happy || 0) > 0.08) {
              smileBoost = Math.min(0.95, (rawExp.happy || 0) * 2.5 + Math.max(0, smileCurvature * 25) + 0.35);
            }

            // Surprise trigger (mouth open or raised eyebrows)
            if (mouthOpenRatio > 0.28 || browLift > 0.16 || (rawExp.surprised || 0) > 0.08) {
              surpriseBoost = Math.min(0.95, (rawExp.surprised || 0) * 2.5 + Math.max(0, (mouthOpenRatio - 0.25) * 3) + 0.3);
            }

            // Anger / Frown trigger (eyebrows close together & pulled down)
            if (innerBrowSpacing < 0.12 || (rawExp.angry || 0) > 0.08) {
              angryBoost = Math.min(0.92, (rawExp.angry || 0) * 2.8 + 0.3);
            }

            // Sadness trigger (mouth corners drooping)
            if (smileCurvature < -0.015 || (rawExp.sad || 0) > 0.08) {
              sadBoost = Math.min(0.90, (rawExp.sad || 0) * 2.5 + 0.3);
            }
          }

          // Build dynamic adjusted emotion vector
          const dynamicHappy = Math.max(rawExp.happy || 0, smileBoost);
          const dynamicSurprised = Math.max(rawExp.surprised || 0, surpriseBoost);
          const dynamicAngry = Math.max(rawExp.angry || 0, angryBoost);
          const dynamicSad = Math.max(rawExp.sad || 0, sadBoost);
          const dynamicFearful = rawExp.fearful || 0;
          const dynamicDisgusted = rawExp.disgusted || 0;

          // Dampen neutral when emotional cues are present
          const hasActiveEmotion = dynamicHappy > 0.25 || dynamicSurprised > 0.25 || dynamicAngry > 0.25 || dynamicSad > 0.25;
          const dynamicNeutral = hasActiveEmotion
            ? Math.max(0.05, (rawExp.neutral || 0) * 0.2)
            : Math.max(0.6, rawExp.neutral || 0.85);

          const adjustedMap: Record<string, number> = {
            happy: dynamicHappy,
            surprised: dynamicSurprised,
            neutral: dynamicNeutral,
            sad: dynamicSad,
            angry: dynamicAngry,
            fearful: dynamicFearful,
            disgusted: dynamicDisgusted,
          };

          // Normalize sum to ~1
          const totalWeight = Object.values(adjustedMap).reduce((a, b) => a + b, 0) || 1;

          const sorted = Object.entries(adjustedMap)
            .map(([emotion, rawVal]) => {
              const score = Math.min(0.99, Math.max(0.01, rawVal / totalWeight));
              return {
                emotion,
                score,
                label: EMOTION_META[emotion]?.label || emotion,
                emoji: EMOTION_META[emotion]?.emoji || '😐',
                color: EMOTION_META[emotion]?.color || '#8b5cf6',
              };
            })
            .sort((a, b) => b.score - a.score);

          setEmotionScores(sorted);

          if (sorted.length > 0) {
            const top = sorted[0];
            setDominantEmotion(top);

            // Smile Intensity
            const smilePercent = Math.min(100, Math.round(dynamicHappy * 100));
            setSmileScore(smilePercent);

            // Update Live Timeline Data
            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setTimelineData((prev) => {
              const newPoint: EmotionTimelinePoint = {
                time: nowTime,
                happy: Math.round(dynamicHappy * 100),
                neutral: Math.round(dynamicNeutral * 100),
                surprised: Math.round(dynamicSurprised * 100),
                sad: Math.round(dynamicSad * 100),
                angry: Math.round(dynamicAngry * 100),
              };
              return [...prev, newPoint].slice(-25);
            });
          }

          // 2. Age & Gender
          if (primaryFace.age) setEstimatedAge(Math.round(primaryFace.age));
          if (primaryFace.gender) setEstimatedGender(primaryFace.gender);

          // 3. Attention & Gaze Metric
          const centerX = box.x + box.width / 2;
          const frameCenter = canvas.width / 2;
          const distRatio = Math.abs(centerX - frameCenter) / (canvas.width / 2);
          const att = Math.max(20, Math.round((1 - distRatio * 0.7) * 100));
          setAttentionScore(att);

          // 4. Custom Futuristic Cyberpunk HUD Canvas Draw
          resizedDetections.forEach((det, idx) => {
            const b = det.detection.box;
            const activeEm = idx === 0 && sorted.length > 0
              ? sorted[0]
              : { emotion: 'neutral', label: 'Neutral', emoji: '😐', score: 0.9, color: '#3b82f6' };
            const meta = EMOTION_META[activeEm.emotion] || { color: '#8b5cf6', emoji: '✨', label: activeEm.label };

            // Draw Corner Brackets (Sci-fi Reticle)
            if (showFaceBox) {
              ctx.strokeStyle = meta.color;
              ctx.lineWidth = 3;
              const len = 20;

              // Top-Left
              ctx.beginPath();
              ctx.moveTo(b.x, b.y + len);
              ctx.lineTo(b.x, b.y);
              ctx.lineTo(b.x + len, b.y);
              ctx.stroke();

              // Top-Right
              ctx.beginPath();
              ctx.moveTo(b.x + b.width - len, b.y);
              ctx.lineTo(b.x + b.width, b.y);
              ctx.lineTo(b.x + b.width, b.y + len);
              ctx.stroke();

              // Bottom-Left
              ctx.beginPath();
              ctx.moveTo(b.x, b.y + b.height - len);
              ctx.lineTo(b.x, b.y + b.height);
              ctx.lineTo(b.x + len, b.y + b.height);
              ctx.stroke();

              // Bottom-Right
              ctx.beginPath();
              ctx.moveTo(b.x + b.width - len, b.y + b.height);
              ctx.lineTo(b.x + b.width, b.y + b.height);
              ctx.lineTo(b.x + b.width, b.y + b.height - len);
              ctx.stroke();

              // Translucent Box fill
              ctx.fillStyle = `${meta.color}15`;
              ctx.fillRect(b.x, b.y, b.width, b.height);
            }

            // Draw Facial Landmarks (Mesh nodes)
            if (showLandmarks && det.landmarks) {
              ctx.fillStyle = '#06b6d4';
              det.landmarks.positions.forEach((pt) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
                ctx.fill();
              });
            }

            // Draw Floating Emotion Tag Banner
            if (showEmotionTag) {
              const labelText = `${meta.emoji} ${meta.label} (${Math.round(activeEm.score * 100)}%)`;
              ctx.font = 'bold 15px sans-serif';
              const textWidth = ctx.measureText(labelText).width;
              const bannerH = 28;
              const bannerY = Math.max(10, b.y - bannerH - 8);

              // Pill background
              ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
              ctx.beginPath();
              ctx.roundRect(b.x, bannerY, textWidth + 24, bannerH, 6);
              ctx.fill();

              ctx.strokeStyle = meta.color;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Text
              ctx.fillStyle = '#ffffff';
              ctx.fillText(labelText, b.x + 12, bannerY + 19);
            }
          });
        }
      }

      // FPS calculation
      frameCountRef.current += 1;
      const now = Date.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }
    } catch {
      // Ignore individual frame parse errors
    }

    if (cameraActiveRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [detectionConfidenceThreshold, showFaceBox, showLandmarks, showEmotionTag]);

  // Trigger detection loop when camera activates
  useEffect(() => {
    if (cameraActive) {
      animationFrameIdRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [cameraActive, runDetectionLoop]);

  // 6. Interactive Live Demo Simulator (for testing without physical camera)
  const startLiveDemoSimulation = () => {
    userManuallyStoppedRef.current = false;
    cameraActiveRef.current = false;
    setCameraActive(false);
    setIsDemoMode(true);
    setPermissionDenied(false);

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    onShowToastRef.current('🚀 Live AI Simulation Demo running!');

    const emotionsCycle = [
      { emotion: 'happy', label: 'Happy', emoji: '😊', score: 0.94, color: '#10b981', smile: 92, att: 95 },
      { emotion: 'surprised', label: 'Surprised', emoji: '😲', score: 0.88, color: '#f59e0b', smile: 45, att: 88 },
      { emotion: 'neutral', label: 'Neutral', emoji: '😐', score: 0.96, color: '#3b82f6', smile: 12, att: 92 },
      { emotion: 'happy', label: 'Happy', emoji: '😊', score: 0.98, color: '#10b981', smile: 96, att: 98 },
    ];

    let cycleIdx = 0;

    demoIntervalRef.current = setInterval(() => {
      const curr = emotionsCycle[cycleIdx % emotionsCycle.length];
      cycleIdx++;

      setDetectedFacesCount(1);
      setDominantEmotion(curr);
      setSmileScore(curr.smile);
      setAttentionScore(curr.att);
      setEstimatedAge(25);
      setEstimatedGender('male');
      setFps(60);

      const simScores: EmotionScore[] = [
        { emotion: curr.emotion, label: curr.label, emoji: curr.emoji, score: curr.score, color: curr.color },
        { emotion: 'neutral', label: 'Neutral', emoji: '😐', score: Math.max(0.02, 1 - curr.score), color: '#3b82f6' },
        { emotion: 'happy', label: 'Happy', emoji: '😊', score: curr.emotion === 'happy' ? curr.score : 0.05, color: '#10b981' },
        { emotion: 'surprised', label: 'Surprised', emoji: '😲', score: curr.emotion === 'surprised' ? curr.score : 0.03, color: '#f59e0b' },
        { emotion: 'sad', label: 'Sad', emoji: '😢', score: 0.01, color: '#6366f1' },
        { emotion: 'angry', label: 'Angry', emoji: '😠', score: 0.01, color: '#ef4444' },
        { emotion: 'fearful', label: 'Fearful', emoji: '😨', score: 0.01, color: '#ec4899' },
      ];
      setEmotionScores(simScores);

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTimelineData((prev) => [
        ...prev,
        {
          time: nowTime,
          happy: curr.emotion === 'happy' ? Math.round(curr.score * 100) : 5,
          neutral: curr.emotion === 'neutral' ? Math.round(curr.score * 100) : 10,
          surprised: curr.emotion === 'surprised' ? Math.round(curr.score * 100) : 5,
          sad: 2,
          angry: 1,
        },
      ].slice(-25));

      // Draw simulated sci-fi HUD on canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Grid background simulation
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Cyber face reticle
          const bx = 180;
          const by = 110;
          const bw = 280;
          const bh = 280;

          ctx.strokeStyle = curr.color;
          ctx.lineWidth = 3;
          ctx.strokeRect(bx, by, bw, bh);

          // Floating label
          const labelText = `${curr.emoji} ${curr.label} (${Math.round(curr.score * 100)}%)`;
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
          ctx.fillRect(bx, by - 36, ctx.measureText(labelText).width + 24, 30);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelText, bx + 12, by - 16);
        }
      }
    }, 1200);
  };

  // 7. Snapshot Capture Feature
  const handleCaptureSnapshot = () => {
    if ((!videoRef.current && !isDemoMode) || (!cameraActive && !isDemoMode)) {
      onShowToastRef.current('Please activate camera or demo mode first to take a snapshot.');
      return;
    }

    const video = videoRef.current;
    const overlay = canvasRef.current;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = overlay?.width || 640;
    snapCanvas.height = overlay?.height || 480;
    const ctx = snapCanvas.getContext('2d');

    if (ctx) {
      if (cameraActive && video) {
        ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      } else {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, snapCanvas.width, snapCanvas.height);
      }

      if (overlay) {
        ctx.drawImage(overlay, 0, 0, snapCanvas.width, snapCanvas.height);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, snapCanvas.height - 40, snapCanvas.width, 40);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      const timeStr = new Date().toLocaleString();
      const stampText = `APEX AI EMOTION RADAR • ${dominantEmotion.emoji} ${dominantEmotion.label} (${Math.round(dominantEmotion.score * 100)}%) • ${timeStr}`;
      ctx.fillText(stampText, 16, snapCanvas.height - 15);

      const dataUrl = snapCanvas.toDataURL('image/png');
      const snap: EmotionSnapshot = {
        id: `snap-${Date.now()}`,
        dataUrl,
        dominantEmotion: dominantEmotion.label,
        emoji: dominantEmotion.emoji,
        confidence: Math.round(dominantEmotion.score * 100),
        age: estimatedAge || undefined,
        gender: estimatedGender || undefined,
        timestamp: new Date().toLocaleTimeString(),
      };

      setSnapshots((prev) => [snap, ...prev]);
      onShowToastRef.current(`📸 Snapshot saved: ${dominantEmotion.emoji} ${dominantEmotion.label}!`);
    }
  };

  const handleDownloadSnapshot = (snap: EmotionSnapshot) => {
    const a = document.createElement('a');
    a.href = snap.dataUrl;
    a.download = `emotion-capture-${snap.dominantEmotion.toLowerCase()}-${Date.now()}.png`;
    a.click();
  };

  const handleClearSnapshots = () => {
    setSnapshots([]);
    onShowToastRef.current('Snapshots gallery cleared.');
  };

  // 8. Upload Image & Analyze with AI
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result as string;
      setIsDemoMode(true);
      setCameraActive(false);
      cameraActiveRef.current = false;
      setPermissionDenied(false);

      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }

      const img = new Image();
      img.src = src;
      img.onload = async () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const displaySize = { width: img.width, height: img.height };
        faceapi.matchDimensions(canvas, displaySize);

        try {
          const detections = await faceapi
            .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
            .withFaceLandmarks(true)
            .withFaceExpressions()
            .withAgeAndGender();

          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            setDetectedFacesCount(resizedDetections.length);

            if (resizedDetections.length > 0) {
              const primary = resizedDetections[0];
              const sorted = Object.entries(primary.expressions)
                .map(([emotion, score]) => ({
                  emotion,
                  score,
                  label: EMOTION_META[emotion]?.label || emotion,
                  emoji: EMOTION_META[emotion]?.emoji || '😐',
                  color: EMOTION_META[emotion]?.color || '#8b5cf6',
                }))
                .sort((a, b) => b.score - a.score);

              setEmotionScores(sorted);
              if (sorted.length > 0) setDominantEmotion(sorted[0]);
              if (primary.age) setEstimatedAge(Math.round(primary.age));
              if (primary.gender) setEstimatedGender(primary.gender);

              resizedDetections.forEach((det) => {
                const b = det.detection.box;
                const topExp = Object.entries(det.expressions).sort((a, b) => b[1] - a[1])[0];
                const meta = EMOTION_META[topExp[0]] || { color: '#8b5cf6', emoji: '✨', label: topExp[0] };

                ctx.strokeStyle = meta.color;
                ctx.lineWidth = 3;
                ctx.strokeRect(b.x, b.y, b.width, b.height);

                if (det.landmarks) {
                  ctx.fillStyle = '#06b6d4';
                  det.landmarks.positions.forEach((pt) => {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                  });
                }

                const labelText = `${meta.emoji} ${meta.label} (${Math.round(topExp[1] * 100)}%)`;
                ctx.font = 'bold 16px sans-serif';
                ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
                ctx.fillRect(b.x, Math.max(10, b.y - 32), ctx.measureText(labelText).width + 20, 28);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(labelText, b.x + 10, Math.max(10, b.y - 32) + 20);
              });

              onShowToastRef.current(`Photo analyzed! Detected: ${sorted[0].emoji} ${sorted[0].label}`);
            } else {
              onShowToastRef.current('No face detected in the uploaded photo. Try another image.');
            }
          }
        } catch (err) {
          console.error('Image analysis error:', err);
          onShowToastRef.current('Failed to analyze photo with face-api.');
        }
      };
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div
        className="welcome-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.35)',
        }}
      >
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span
              className="badge"
              style={{
                background: modelsLoaded ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: modelsLoaded ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                border: `1px solid ${modelsLoaded ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              <ScanFace size={13} /> {modelsLoaded ? 'Neural Models Ready' : 'Loading Neural Models...'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              100% On-Device AI • Zero Cloud Uploads
            </span>
          </div>
          <h1>Real-Time AI Facial Emotion Detection Camera</h1>
          <p>
            High-speed neural landmark tracking analyzing 7 micro-expressions, smile telemetry, focus attention score, and mood dynamics at 60 FPS.
          </p>
        </div>

        <div className="banner-actions">
          {cameraActive ? (
            <button className="btn-secondary" onClick={stopCamera} style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)' }}>
              <CameraOff size={16} /> Stop Camera
            </button>
          ) : (
            <button className="btn-primary" onClick={() => startCamera()} disabled={!modelsLoaded || cameraLoading}>
              <Camera size={16} /> {cameraLoading ? 'Connecting...' : 'Start AI Camera'}
            </button>
          )}

          {/* Live Demo Simulation Button */}
          <button
            className="btn-secondary"
            onClick={startLiveDemoSimulation}
            title="Launch real-time AI simulation demo"
            style={{ borderColor: 'rgba(6, 182, 212, 0.4)', color: 'var(--accent-cyan)' }}
          >
            <Play size={15} /> Demo Mode
          </button>

          {/* Upload Photo Button */}
          <input
            type="file"
            ref={imageUploadRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="btn-secondary"
            onClick={() => imageUploadRef.current?.click()}
            title="Upload any selfie or photo to analyze"
          >
            <Upload size={15} /> Upload Photo
          </button>

          <button className="btn-secondary" onClick={handleCaptureSnapshot} disabled={!cameraActive && !isDemoMode}>
            <Sparkles size={16} style={{ color: 'var(--accent-purple)' }} /> Capture Snapshot
          </button>
        </div>
      </div>

      {/* PERMISSION DENIED INTERACTIVE TROUBLESHOOTER BANNER */}
      {permissionDenied && (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(244, 63, 94, 0.1) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
                flexShrink: 0,
              }}
            >
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Camera Permission is Blocked or Denied
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {permissionErrorMsg || 'Your browser blocked camera access. Please allow permission to enable real-time detection.'}
              </p>
            </div>
          </div>

          {/* Quick Steps Guide */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.85rem',
              fontSize: '0.82rem',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <strong style={{ color: 'var(--accent-amber)', display: 'block', marginBottom: '0.25rem' }}>
                1. Browser Address Bar:
              </strong>
              Look at the top URL bar in your browser. Click the <strong>Camera / Tune icon 🔒</strong> next to the website URL.
            </div>
            <div>
              <strong style={{ color: 'var(--accent-amber)', display: 'block', marginBottom: '0.25rem' }}>
                2. Change to "Allow":
              </strong>
              Switch the Camera permission setting from <strong>"Block"</strong> to <strong>"Allow"</strong>.
            </div>
            <div>
              <strong style={{ color: 'var(--accent-amber)', display: 'block', marginBottom: '0.25rem' }}>
                3. macOS System Permission:
              </strong>
              If still blocked, open <strong>System Settings → Privacy &amp; Security → Camera</strong> and enable your browser.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={() => startCamera()} style={{ fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> Retry Camera Permission Now
            </button>
            <button className="btn-secondary" onClick={startLiveDemoSimulation} style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
              <Play size={14} /> Launch Live Demo Mode
            </button>
            <button
              className="btn-secondary"
              onClick={() => imageUploadRef.current?.click()}
              style={{ fontSize: '0.85rem' }}
            >
              <Upload size={14} /> Test with Uploaded Photo Instead
            </button>
          </div>
        </div>
      )}

      {modelLoadingError && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--accent-rose)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>Model Load Error: {modelLoadingError}</span>
        </div>
      )}

      {/* Main Grid: Video Stream Left, Emotion Meters & Telemetry Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.2fr) minmax(340px, 0.8fr)', gap: '1.5rem' }}>
        {/* LEFT COLUMN: Camera Feed + Canvas Overlay */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            className="glass-panel"
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative',
              backgroundColor: '#050811',
              border: '1px solid var(--border-highlight)',
              overflow: 'hidden',
            }}
          >
            {/* Camera Viewport Container */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: '#020408',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Mirrored for intuitive selfie view
                  display: cameraActive ? 'block' : 'none',
                }}
              />

              {/* Holographic HUD Canvas Overlay */}
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: cameraActive ? 'scaleX(-1)' : 'none',
                  pointerEvents: 'none',
                  display: cameraActive || isDemoMode ? 'block' : 'none',
                }}
              />

              {/* Inactive Camera / Permission Blocked Placeholder Screen */}
              {!cameraActive && !isDemoMode && (
                <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: permissionDenied
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
                      border: `2px dashed ${permissionDenied ? 'var(--accent-amber)' : 'var(--accent-emerald)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: permissionDenied ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                    }}
                  >
                    {permissionDenied ? <Lock size={32} /> : <Camera size={32} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {permissionDenied ? 'Camera Access Blocked' : 'AI Emotion Camera Ready'}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '380px' }}>
                      {permissionDenied
                        ? 'Click "Retry Camera Permission" above or test with Demo Mode / Upload Photo.'
                        : 'Click "Start AI Camera" to activate real-time facial expression tracking and emotion meters.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      className="btn-primary"
                      onClick={() => startCamera()}
                      disabled={!modelsLoaded || cameraLoading}
                    >
                      <Camera size={16} /> {cameraLoading ? 'Connecting...' : 'Start Camera Now'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={startLiveDemoSimulation}
                      style={{ color: 'var(--accent-cyan)' }}
                    >
                      <Play size={15} /> Demo Mode
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => imageUploadRef.current?.click()}
                    >
                      <Upload size={15} /> Upload Photo
                    </button>
                  </div>
                </div>
              )}

              {/* HUD Live Badge Strip & Quick Turn-Off Button */}
              {(cameraActive || isDemoMode) && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      display: 'flex',
                      gap: '0.5rem',
                      zIndex: 10,
                    }}
                  >
                    <span className="badge badge-success" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                      <span className="pulse-dot" /> {cameraActive ? `LIVE ${fps} FPS` : 'DEMO MODE'}
                    </span>
                    <span className="badge" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.4)' }}>
                      <Users size={12} /> {detectedFacesCount} Face{detectedFacesCount !== 1 ? 's' : ''}
                    </span>
                    {estimatedAge && estimatedGender && (
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--accent-purple)', border: '1px solid rgba(139,92,246,0.4)' }}>
                        {estimatedGender === 'male' ? '👨' : '👩'} ~{estimatedAge} yrs
                      </span>
                    )}
                  </div>

                  {/* Top-Right Turn Off Camera Button */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'flex',
                      gap: '0.5rem',
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={stopCamera}
                      style={{
                        background: 'rgba(244, 63, 94, 0.85)',
                        color: '#ffffff',
                        border: '1px solid rgba(244, 63, 94, 0.9)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        transition: 'all var(--transition-fast)',
                      }}
                      title="Turn off webcam and stop facial detection stream"
                    >
                      <CameraOff size={13} /> Turn Off Camera
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Camera Controls & Overlay Toggles */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
              {/* Device Selector */}
              {devices.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Camera:</span>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      if (cameraActive) startCamera(e.target.value);
                    }}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem',
                      outline: 'none',
                    }}
                  >
                    {devices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '0.85rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showFaceBox}
                    onChange={(e) => setShowFaceBox(e.target.checked)}
                    style={{ accentColor: 'var(--accent-purple)' }}
                  />
                  Face Box
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showLandmarks}
                    onChange={(e) => setShowLandmarks(e.target.checked)}
                    style={{ accentColor: 'var(--accent-cyan)' }}
                  />
                  68 Landmarks Mesh
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showEmotionTag}
                    onChange={(e) => setShowEmotionTag(e.target.checked)}
                    style={{ accentColor: 'var(--accent-emerald)' }}
                  />
                  Emotion Tag
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Sensitivity:</span>
                  <input
                    type="range"
                    min={0.2}
                    max={0.8}
                    step={0.05}
                    value={detectionConfidenceThreshold}
                    onChange={(e) => setDetectionConfidenceThreshold(parseFloat(e.target.value))}
                    style={{ width: '65px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                    title={`Detection threshold: ${Math.round(detectionConfidenceThreshold * 100)}%`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Mood Fluctuations Timeline Chart */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={16} style={{ color: 'var(--accent-emerald)' }} /> Live Emotion Dynamics Timeline
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Continuous mood probability waveform stream
                </p>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                60 FPS Real-Time
              </span>
            </div>

            <div style={{ width: '100%', height: '180px' }}>
              {timelineData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Start camera to stream live emotional wave telemetry.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHappy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSurprised" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}
                      formatter={(val: any) => [`${val}%`, '']}
                    />
                    <Area type="monotone" dataKey="happy" name="Happy" stroke="#10b981" strokeWidth={2} fill="url(#colorHappy)" />
                    <Area type="monotone" dataKey="neutral" name="Neutral" stroke="#3b82f6" strokeWidth={1.5} fill="url(#colorNeutral)" />
                    <Area type="monotone" dataKey="surprised" name="Surprised" stroke="#f59e0b" strokeWidth={1.5} fill="url(#colorSurprised)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dominant Emotion Hero + 7 Emotion Confidence Meters + Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Dominant Emotion Hero Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              borderLeft: `4px solid ${dominantEmotion.color}`,
              background: `linear-gradient(135deg, ${dominantEmotion.color}15 0%, rgba(255,255,255,0.02) 100%)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                Dominant Mood State
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: dominantEmotion.color,
                  background: `${dominantEmotion.color}25`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {Math.round(dominantEmotion.score * 100)}% Confidence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ fontSize: '3.5rem', lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
                {dominantEmotion.emoji}
              </div>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize' }}>
                  {dominantEmotion.label}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                  {EMOTION_META[dominantEmotion.emotion]?.desc || 'Facial cues processed in real time.'}
                </p>
              </div>
            </div>

            {/* Live Telemetry Meters Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Smile Intensity</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: smileScore > 50 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                  {smileScore}%
                </span>
              </div>
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Focus & Attention</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: attentionScore > 75 ? 'var(--accent-cyan)' : 'var(--accent-amber)' }}>
                  {attentionScore}%
                </span>
              </div>
            </div>
          </div>

          {/* 7 Facial Emotion Meters Grid */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={16} style={{ color: 'var(--accent-purple)' }} /> 7 Emotion Confidence Breakdown
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(EMOTION_META).map(([key, meta]) => {
                const cur = emotionScores.find((e) => e.emotion === key);
                const score = cur ? Math.round(cur.score * 100) : key === 'neutral' ? 95 : 0;

                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                        <span>{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span style={{ color: score > 20 ? meta.color : 'var(--text-muted)', fontWeight: 700 }}>
                        {score}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${score}%`,
                          height: '100%',
                          backgroundColor: meta.color,
                          borderRadius: '3px',
                          transition: 'width 0.25s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Snapshots Gallery Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={18} style={{ color: 'var(--accent-purple)' }} /> Captured Emotion Snapshots ({snapshots.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Watermarked snapshots with AI emotion classification stamps
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleCaptureSnapshot} disabled={!cameraActive && !isDemoMode} style={{ fontSize: '0.8rem' }}>
              <Sparkles size={14} /> Take Photo Now
            </button>
            {snapshots.length > 0 && (
              <button className="btn-secondary" onClick={handleClearSnapshots} style={{ fontSize: '0.8rem' }}>
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>
        </div>

        {snapshots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <Camera size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No snapshots taken yet.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Start your AI camera or Demo Mode and click <strong>"Capture Snapshot"</strong> to log your mood.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {snapshots.map((s) => (
              <div
                key={s.id}
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                  <img src={s.dataUrl} alt={s.dominantEmotion} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.75)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {s.emoji} {s.dominantEmotion} ({s.confidence}%)
                  </span>
                </div>

                <div style={{ padding: '0.75rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{s.timestamp}</span>
                  <button
                    className="btn-icon"
                    onClick={() => handleDownloadSnapshot(s)}
                    style={{ width: '28px', height: '28px' }}
                    title="Download Snapshot Image"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MOOD-BASED MUSIC PLAYLIST ────────────────────────────── */}
        <MoodPlaylist
          dominantEmotion={dominantEmotion.emotion}
          isActive={cameraActive || isDemoMode}
        />

      </div>

      {/* ── AI MOOD CHATBOT (Floating Widget) ─────────────────────── */}
      <MoodChatbot
        dominantEmotion={dominantEmotion.emotion}
        emotionEmoji={dominantEmotion.emoji}
        confidenceScore={dominantEmotion.score}
        isActive={cameraActive || isDemoMode}
      />

    </div>
  );
};
