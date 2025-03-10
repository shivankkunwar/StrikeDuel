// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Joystick } from 'react-joystick-component';
import * as THREE from 'three';
import PlayerCharacter from './PlayerCharacter';
import FootballField from './FootballField';

// Define types for props and state
interface GameLogicProps {
  gameStarted: boolean;
  gameOver: boolean;
  keys: { w: boolean; a: boolean; s: boolean; d: boolean; space: boolean; sprint: boolean };
  joystickMove: { x: number; y: number };
  setBallVelocity: (velocity: { x: number; z: number }) => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  goalScored: boolean; 
  setGoalScored: (scored: boolean) => void;
  setKeys: React.Dispatch<React.SetStateAction<{ w: boolean; a: boolean; s: boolean; d: boolean; space: boolean; sprint: boolean }>>;
  setPowerLevel: (level: number) => void;
  setStamina: (stamina: number) => void;
  isMobile: boolean;
}

// GameLogic Component
function GameLogic({
  gameStarted,
  gameOver,
  keys,
  joystickMove,
  setBallVelocity,
  setScore,
  goalScored, 
  setGoalScored,
  setKeys,
  setPowerLevel,
  setStamina,
  isMobile,
}: GameLogicProps){
  const playerRef = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const defenderRef = useRef<THREE.Group>(null);
  const goalkeeperRef = useRef<THREE.Group>(null);
  const [canKick, setCanKick] = useState(true);
  const [playerDirection, setPlayerDirection] = useState(new THREE.Vector3(0, 0, -1));
  const [powerCharging, setPowerCharging] = useState(false);
  const [powerCharge, setPowerCharge] = useState(0);
  const [ballHeight, setBallHeight] = useState(0);
  const [ballVerticalVelocity, setBallVerticalVelocity] = useState(0);
  const [playerStamina, setPlayerStamina] = useState(100);
  const [sprintActive, setSprintActive] = useState(false);
  const [lastTouchedBy, setLastTouchedBy] = useState<string | null>(null);
  const [playerPreviousPosition, setPlayerPreviousPosition] = useState({ x: 0, z: 5 });

  useFrame((state, delta) => {
    if (!gameStarted || gameOver) return;

    // Update previous position at the start of each frame
    if (playerRef.current) {
      setPlayerPreviousPosition({ x: playerRef.current.position.x, z: playerRef.current.position.z });
    }

    // Player Movement and Direction
    let moveX = 0;
    let moveZ = 0;
    if (isMobile) {
      if (joystickMove.y < 0) moveZ += 1;
      if (joystickMove.y > 0) moveZ -= 1;
      if (joystickMove.x < 0) moveX -= 1;
      if (joystickMove.x > 0) moveX += 1;
    } else {
      if (keys.w || joystickMove.y > 0) moveZ -= 1;
      if (keys.s || joystickMove.y < 0) moveZ += 1;
      if (keys.a || joystickMove.x < 0) moveX -= 1;
      if (keys.d || joystickMove.x > 0) moveX += 1;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const direction = new THREE.Vector3(moveX, 0, moveZ).normalize();
      setPlayerDirection(direction);
    }

    // Sprint and Stamina System
    let speed = 5;
    if (keys.sprint && playerStamina > 10) {
      speed = 8;
      setSprintActive(true);
      setPlayerStamina(Math.max(0, playerStamina - 0.5));
    } else {
      setSprintActive(false);
      setPlayerStamina(Math.min(100, playerStamina + 0.2));
    }
    setStamina(playerStamina);

    // Player Movement with Rotation
    if (playerRef.current) {
      playerRef.current.position.x += moveX * speed * delta;
      playerRef.current.position.z += moveZ * speed * delta;

      const bounds = { x: 25, z: 15 };
      playerRef.current.position.x = Math.max(-bounds.x, Math.min(bounds.x, playerRef.current.position.x));
      playerRef.current.position.z = Math.max(-bounds.z, Math.min(bounds.z, playerRef.current.position.z));

      if (moveX !== 0 || moveZ !== 0) {
        const targetRotation = Math.atan2(moveX, -moveZ);
        playerRef.current.rotation.y = targetRotation;
      }
    }

    // Power Kick Charging Mechanism
    if (keys.space && canKick && !sprintActive) {
      if (!powerCharging) {
        setPowerCharging(true);
        setPowerCharge(0);
      } else {
        setPowerCharge(Math.min(100, powerCharge + 120 * delta));
        setPowerLevel(Math.min(100, powerCharge + 120 * delta));
      }
    } else if (powerCharging) {
      setPowerCharging(false);
      setPowerLevel(0);
    }

    // Enhanced Ball Physics with Velocity-Based Control
    if (ballRef.current && playerRef.current) {
      let velocityX = ballRef.current.userData.velocityX || 0;
      let velocityZ = ballRef.current.userData.velocityZ || 0;
      const distanceToBall = playerRef.current.position.distanceTo(
        new THREE.Vector3(ballRef.current.position.x, 0, ballRef.current.position.z)
      );

      // Ball Control Zone System
      const perfectControlZone = 0.8;
      const looseControlZone = 1.5;
      const isInPerfectControl = distanceToBall < perfectControlZone && ballHeight < 1;
      const isInLooseControl = distanceToBall < looseControlZone && ballHeight < 1;

      if (isInLooseControl && !powerCharging) {
        const playerVelocity = new THREE.Vector3(moveX * speed, 0, moveZ * speed);
        const directionVector = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, playerRef.current.rotation.y, 0));
        
        // Dynamic dribble distance based on player speed and control zone
        const playerSpeed = Math.sqrt(moveX * moveX + moveZ * moveZ) * speed;
        const controlQuality = 1 - (distanceToBall - perfectControlZone) / (looseControlZone - perfectControlZone);
        const dribbleDistance = Math.max(0.5, Math.min(1.5, playerSpeed * 0.15 + 0.5));
        
        const targetBallPosition = new THREE.Vector3(playerPreviousPosition.x, 0, playerPreviousPosition.z).add(
          directionVector.multiplyScalar(dribbleDistance)
        );

        const positionError = targetBallPosition.clone().sub(ballRef.current.position);
        const k = isInPerfectControl ? 2 : 1 * controlQuality;
        const desiredVelocityAdjustment = positionError.multiplyScalar(k);

        // Add slight randomization to ball control based on speed
        const randomFactor = 0.05 * (1 - controlQuality) * playerSpeed;
        const desiredVelocityX = playerVelocity.x + desiredVelocityAdjustment.x + (Math.random() - 0.5) * randomFactor;
        const desiredVelocityZ = playerVelocity.z + desiredVelocityAdjustment.z + (Math.random() - 0.5) * randomFactor;

        // Smoother ball control transition
        const smoothingFactor = isInPerfectControl ? 0.15 : 0.08;
        velocityX += (desiredVelocityX - velocityX) * smoothingFactor;
        velocityZ += (desiredVelocityZ - velocityZ) * smoothingFactor;

        setBallHeight(0);
        setBallVerticalVelocity(0);
        setLastTouchedBy('player');
      } else {
        if (!keys.space && powerCharging && canKick && distanceToBall < 2 && ballHeight < 1) {
          // Enhanced kicking system
          const kickPower = 10 + (powerCharge / 100) * 25; // Increased max power
          const kickDirection = playerDirection.clone();
          
          // Add slight variance to kick direction based on power
          const directionVariance = (1 - powerCharge / 100) * 0.2; // More variance at lower power
          kickDirection.x += (Math.random() - 0.5) * directionVariance;
          kickDirection.z += (Math.random() - 0.5) * directionVariance;
          
          const kickForce = kickDirection.normalize().multiplyScalar(kickPower);
          velocityX = kickForce.x;
          velocityZ = kickForce.z;

          // Enhanced ball lift mechanics
          if (powerCharge > 50) {
            const liftPower = 5 + (powerCharge - 50) / 50 * 12;
            const randomLift = Math.random() * 2 - 1; // -1 to 1
            setBallVerticalVelocity(liftPower + randomLift);
          } else {
            setBallVerticalVelocity(Math.random() * 3); // Low power shots stay low
          }

          setCanKick(false);
          setTimeout(() => setCanKick(true), 500);
          setLastTouchedBy('player');
        }

        // Dynamic friction based on conditions
        const airResistance = 0.995;
        const groundFriction = ballHeight > 0 ? airResistance : 0.98;
        const speedBasedFriction = Math.min(1, Math.sqrt(velocityX * velocityX + velocityZ * velocityZ) * 0.1);
        const finalFriction = groundFriction - speedBasedFriction * 0.02;
        
        velocityX *= finalFriction;
        velocityZ *= finalFriction;

        if (ballHeight > 0 || ballVerticalVelocity !== 0) {
          // Enhanced gravity and bounce physics
          const gravity = 9.8;
          setBallVerticalVelocity((prev) => prev - gravity * delta);
          setBallHeight((prev) => prev + ballVerticalVelocity * delta);

          if (ballHeight <= 0 && ballVerticalVelocity < 0) {
            setBallHeight(0);
            const bounceEfficiency = 0.7; // Ball energy retention
            const speedImpact = Math.min(1, Math.abs(ballVerticalVelocity) / 10);
            setBallVerticalVelocity((prev) => -prev * bounceEfficiency * speedImpact);
            
            if (Math.abs(ballVerticalVelocity) < 1) {
              setBallVerticalVelocity(0);
            }
            // Add horizontal energy loss on bounce
            velocityX *= 0.85;
            velocityZ *= 0.85;
          }
        }
      }

      // Store velocities for next frame
      ballRef.current.userData.velocityX = velocityX;
      ballRef.current.userData.velocityZ = velocityZ;
      setBallVelocity({ x: velocityX, z: velocityZ });

      // Enhanced boundary physics with dynamic bouncing
      const bounds = { x: 25, z: 15 };
      const bounceDamping = 0.8; // Base energy retention on bounce
      const minBounceSpeed = 0.5; // Minimum speed to bounce
      const wallElasticity = 1.2; // Slight speed boost on wall hits for more dynamic play

      // Side walls (X-axis)
      if (Math.abs(ballRef.current.position.x) > bounds.x) {
        // Calculate impact velocity for more realistic bounce
        const impactSpeed = Math.abs(velocityX);
        if (impactSpeed > minBounceSpeed) {
          // Add some vertical bounce based on impact speed
          const verticalBoost = Math.min(impactSpeed * 0.2, 4);
          setBallVerticalVelocity((prev) => Math.max(prev, verticalBoost));
          
          // Dynamic bounce effect
          velocityX = -velocityX * bounceDamping * wallElasticity;
          
          // Add slight random deflection
          const deflection = (Math.random() - 0.5) * 0.2;
          velocityZ += velocityZ * deflection;
        } else {
          velocityX = -velocityX * bounceDamping;
        }
        
        // Keep ball in bounds
        ballRef.current.position.x = Math.sign(ballRef.current.position.x) * bounds.x;
      }

      // Goal walls and back walls (Z-axis)
      const isInGoalArea = Math.abs(ballRef.current.position.x) <= 7; // Goal width
      const backWallZ = bounds.z;
      
      if (Math.abs(ballRef.current.position.z) > backWallZ) {
        // Only bounce if not in goal area or if hitting back wall
        if (!isInGoalArea || ballRef.current.position.z > backWallZ) {
          const impactSpeed = Math.abs(velocityZ);
          if (impactSpeed > minBounceSpeed) {
            // Add vertical bounce and spin effect
            const verticalBoost = Math.min(impactSpeed * 0.25, 5);
            setBallVerticalVelocity((prev) => Math.max(prev, verticalBoost));
            
            // Dynamic bounce with wall elasticity
            velocityZ = -velocityZ * bounceDamping * wallElasticity;
            
            // Add random deflection for more unpredictable bounces
            const deflection = (Math.random() - 0.5) * 0.3;
            velocityX += velocityX * deflection;
          } else {
            velocityZ = -velocityZ * bounceDamping;
          }
          
          // Keep ball in bounds
          ballRef.current.position.z = Math.sign(ballRef.current.position.z) * backWallZ;
        }
      }

      // Corner bounce enhancement
      const isNearCorner = Math.abs(ballRef.current.position.x) > bounds.x * 0.9 && 
                          Math.abs(ballRef.current.position.z) > bounds.z * 0.9;
      
      if (isNearCorner) {
        const cornerBounceFactor = 1.3; // Extra bounce in corners
        const totalVelocity = Math.sqrt(velocityX * velocityX + velocityZ * velocityZ);
        
        if (totalVelocity > minBounceSpeed) {
          // Add some vertical bounce in corners
          const cornerVerticalBoost = Math.min(totalVelocity * 0.3, 6);
          setBallVerticalVelocity((prev) => Math.max(prev, cornerVerticalBoost));
          
          // Enhance corner bounces
          velocityX *= -cornerBounceFactor;
          velocityZ *= -cornerBounceFactor;
        }
      }

      // Update ball velocities after boundary checks
      ballRef.current.userData.velocityX = velocityX;
      ballRef.current.userData.velocityZ = velocityZ;

      // Apply ball movement and rotation
      ballRef.current.position.x += velocityX * delta;
      ballRef.current.position.z += velocityZ * delta;
      ballRef.current.position.y = ballHeight;

      // Enhanced ball rotation based on velocity and height
      const ballSpeed = Math.sqrt(velocityX * velocityX + velocityZ * velocityZ);
      if (ballSpeed > 0.1) {
        const rotationAxis = new THREE.Vector3(-velocityZ, 0, velocityX).normalize();
        const rotationSpeed = ballHeight > 0 ? 1.5 : 2.5; // Less rotation in air
        ballRef.current.rotateOnAxis(rotationAxis, ballSpeed * delta * rotationSpeed);
      }

      // Enhanced Goal Detection with Immediate Ball Reset
      const { x, z } = ballRef.current.position;
      const y = ballHeight;
      // Goal line is at z = -15 (matches goalpost position), detect when ball crosses it
      if (z < -15 && x > -5 && x < 5 && y < 2.5) {
        if (!goalScored) {
          setScore((s) => s + 1);
          setGoalScored(true);
          // Reset ball to starting position
          ballRef.current.position.set(0, 0, 10);
          ballRef.current.userData.velocityX = 0;
          ballRef.current.userData.velocityZ = 0;
          setBallHeight(0);
          setBallVerticalVelocity(0);
          setBallVelocity({ x: 0, z: 0 });
        }
      }
    }

    // Improved Collision Detection with Player Exclusion During Control
    const characters = [
      { ref: playerRef, type: 'player' },
      { ref: defenderRef, type: 'defender' },
      { ref: goalkeeperRef, type: 'goalkeeper' },
    ];

    if (ballRef.current && playerRef.current) {
      const distanceToBall = playerRef.current.position.distanceTo(
        new THREE.Vector3(ballRef.current.position.x, 0, ballRef.current.position.z)
      );
      const isPlayerInControl = distanceToBall < 1.5 && ballHeight < 1 && !powerCharging;

      characters.forEach(({ ref, type }) => {
        if (ref.current && (type !== 'player' || !isPlayerInControl)) {
          const ballPos = new THREE.Vector3(
            ballRef.current.position.x,
            ballHeight,
            ballRef.current.position.z
          );
          const distance = ref.current.position.distanceTo(ballPos);
          const characterRadius = 0.5;
          const ballRadius = 0.5;
          const minDistance = characterRadius + ballRadius;

          if (distance < minDistance && ballHeight < 1.5) {
            const normal = ballPos.clone().sub(ref.current.position).normalize();
            const overlap = minDistance - distance;
            ballRef.current.position.x += normal.x * (overlap + 0.01);
            ballRef.current.position.z += normal.z * (overlap + 0.01);

            const velocity = new THREE.Vector3(
              ballRef.current.userData.velocityX || 0,
              0,
              ballRef.current.userData.velocityZ || 0
            );

            let characterVelocity = new THREE.Vector3(0, 0, 0);
            let characterSpeed = 0;

            if (type === 'player') {
              characterVelocity = new THREE.Vector3(moveX, 0, moveZ).normalize();
              characterSpeed = 5 * (sprintActive ? 1.5 : 1.0);
            } else if (type === 'defender' || type === 'goalkeeper') {
              characterVelocity = normal.clone().negate();
              characterSpeed = type === 'defender' ? 4 : 3;
            }

            const impactForce = characterSpeed * Math.max(0.3, Math.abs(characterVelocity.dot(normal)));
            const deflectionVector = new THREE.Vector3();
            const reflectionInfluence = Math.max(0.2, 1 - impactForce / 5);
            const dot = velocity.dot(normal);
            const reflection = normal.clone().multiplyScalar(2 * dot).sub(velocity).negate();

            deflectionVector
              .copy(reflection)
              .multiplyScalar(reflectionInfluence)
              .add(characterVelocity.multiplyScalar(1 - reflectionInfluence));

            const newSpeed = velocity.length() * 0.8 + impactForce;
            deflectionVector.normalize().multiplyScalar(newSpeed);

            ballRef.current.userData.velocityX = deflectionVector.x;
            ballRef.current.userData.velocityZ = deflectionVector.z;

            if (ballVerticalVelocity < 2) {
              setBallVerticalVelocity(1 + Math.random() * impactForce * 0.5);
            }

            setLastTouchedBy(type);
          }
        }
      });
    }

    // Dynamic Camera Follow
    if (playerRef.current && ballRef.current) {
      const playerPos = playerRef.current.position;
      const ballPos = ballRef.current.position;
      const distanceBetween = playerPos.distanceTo(ballPos);
      const cameraHeight = 5 + Math.min(5, distanceBetween * 0.3);
      const cameraDistance = 10 + Math.min(5, distanceBetween * 0.5);

      const targetPos = new THREE.Vector3(
        (playerPos.x + ballPos.x) / 2,
        cameraHeight,
        (playerPos.z + ballPos.z) / 2 + cameraDistance
      );

      state.camera.position.lerp(targetPos, 0.05);
      state.camera.lookAt((playerPos.x + ballPos.x) / 2, 0, (playerPos.z + ballPos.z) / 2);
    }

    // Smarter Defender AI
    if (defenderRef.current && playerRef.current && ballRef.current) {
      const distanceToPlayer = defenderRef.current.position.distanceTo(playerRef.current.position);
      const distanceToBall = defenderRef.current.position.distanceTo(ballRef.current.position);

      let target;
      let defSpeed = 4;

      if (lastTouchedBy === 'player' && distanceToBall < 8 && ballRef.current.position.z < 0) {
        target = ballRef.current.position.clone();
        defSpeed = 4.5;
      } else if (ballRef.current.position.z < -5) {
        const defensivePos = new THREE.Vector3(
          ballRef.current.position.x * 0.7,
          0,
          Math.max(-10, ballRef.current.position.z + 3)
        );
        target = defensivePos;
      } else if (distanceToPlayer < 7 && playerRef.current.position.z < 0) {
        const interceptPos = new THREE.Vector3(
          (playerRef.current.position.x + ballRef.current.position.x) / 2,
          0,
          (playerRef.current.position.z + ballRef.current.position.z) / 2
        );
        target = interceptPos;
      } else {
        target = new THREE.Vector3(
          ballRef.current.position.x * 0.3,
          0,
          Math.max(-2, Math.min(2, ballRef.current.position.z))
        );
      }

      if (target.z > 0) {
        target.z = 0;
      }

      const direction = target.clone().sub(defenderRef.current.position).normalize();
      defenderRef.current.position.add(direction.multiplyScalar(defSpeed * delta));

      if (defenderRef.current.position.z < -12) defenderRef.current.position.z = -12;

      if (direction.length() > 0.1) {
        const targetRotation = Math.atan2(direction.x, -direction.z);
        defenderRef.current.rotation.y = targetRotation;
      }
    }

    // Improved Goalkeeper AI
    if (goalkeeperRef.current && ballRef.current) {
      let gkTarget = goalkeeperRef.current.position.clone();
      let gkSpeed = 3;

      if (ballRef.current.position.z < -8) {
        const ballVelocity = new THREE.Vector3(
          ballRef.current.userData.velocityX || 0,
          0,
          ballRef.current.userData.velocityZ || 0
        );
        const predictedPos = ballRef.current.position.clone().add(ballVelocity.clone().multiplyScalar(0.5));

        if (ballVelocity.z < -1) {
          if (
            Math.abs(ballVelocity.z) > 8 &&
            Math.abs(goalkeeperRef.current.position.x - ballRef.current.position.x) < 3
          ) {
            gkSpeed = 6;
          }
          gkTarget.x = predictedPos.x;
        } else {
          gkTarget.x = ballRef.current.position.x * 0.7;
        }

        gkTarget.x = Math.max(-4, Math.min(4, gkTarget.x));
      } else {
        gkTarget.x = Math.sin(state.clock.elapsedTime * 0.3) * 2;
      }

      goalkeeperRef.current.position.x += (gkTarget.x - goalkeeperRef.current.position.x) * gkSpeed * delta;

      const gkDirection = ballRef.current.position.clone().sub(goalkeeperRef.current.position).normalize();
      if (gkDirection.length() > 0.1) {
        const targetRotation = Math.atan2(gkDirection.x, -gkDirection.z);
        goalkeeperRef.current.rotation.y = targetRotation;
      }
    }
  });

  const renderFieldMarkings = () => {
    return (
      <>
        <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5, 5.2, 32]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 0.2]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, -0.49, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 0.1, 4]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, -0.49, -12]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[12, 6, 0.01]} />
          <meshStandardMaterial color="white" opacity={0.3} transparent={true} />
        </mesh>
      </>
    );
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow={false} />
      <hemisphereLight intensity={0.3} groundColor="#2e7d32" />

      {/* Football Field */}
      <FootballField width={50} length={30} />

      <group ref={playerRef} position={[0, 0, 5]}>
        <PlayerCharacter 
          isMoving={keys.w || keys.s || keys.a || keys.d || 
            Math.abs(joystickMove.x) > 0.1 || Math.abs(joystickMove.y) > 0.1}
          isKicking={powerCharging}
          isRunning={sprintActive}
          color="#2196f3"
        />
      </group>
      <mesh ref={ballRef} position={[0, 0, 10]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshPhongMaterial color="white" />
      </mesh>
      <group ref={defenderRef} position={[5, 0, -5]}>
        <PlayerCharacter 
          isMoving={true}
          isKicking={false}
          isRunning={true}
          color="#f44336"
        />
      </group>
      <group ref={goalkeeperRef} position={[0, 0, -12]}>
        <PlayerCharacter 
          isMoving={true}
          isKicking={false}
          isRunning={false}
          color="#4caf50"
        />
      </group>
      {/* Goal Posts */}
      <GoalPost position={[0, 0, -15]} rotation={0} />
      {/* <GoalPost position={[0, 0, 15]} rotation={Math.PI} /> */}
    </>
  );
}

function GoalPost({ position, rotation = 0 }) {
  const postMaterial = new THREE.MeshStandardMaterial({ 
    color: '#ffffff',
    metalness: 0.6,
    roughness: 0.2,
  });

  const postWidth = 0.2;
  const goalWidth = 10;
  const goalHeight = 5;
  const goalDepth = 3;
  const netMaterial = new THREE.MeshStandardMaterial({ 
    color: '#ffffff',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide 
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Left post */}
      <mesh position={[-goalWidth/2, goalHeight/2, 0]} material={postMaterial}>
        <cylinderGeometry args={[postWidth, postWidth, goalHeight, 16]} />
      </mesh>

      {/* Right post */}
      <mesh position={[goalWidth/2, goalHeight/2, 0]} material={postMaterial}>
        <cylinderGeometry args={[postWidth, postWidth, goalHeight, 16]} />
      </mesh>

      {/* Crossbar */}
      <mesh position={[0, goalHeight, 0]} rotation={[0, 0, Math.PI/2]} material={postMaterial}>
        <cylinderGeometry args={[postWidth, postWidth, goalWidth + postWidth*2, 16]} />
      </mesh>

      {/* Support bars */}
      <mesh position={[-goalWidth/2, goalHeight/2, -goalDepth]} material={postMaterial}>
        <cylinderGeometry args={[postWidth/2, postWidth/2, goalDepth, 16]} />
      </mesh>
      <mesh position={[goalWidth/2, goalHeight/2, -goalDepth]} material={postMaterial}>
        <cylinderGeometry args={[postWidth/2, postWidth/2, goalDepth, 16]} />
      </mesh>
      <mesh position={[0, goalHeight, -goalDepth]} material={postMaterial}>
        <cylinderGeometry args={[postWidth/2, postWidth/2, goalDepth, 16]} />
      </mesh>

      {/* Top support bar */}
      <mesh position={[0, goalHeight, -goalDepth]} rotation={[0, 0, Math.PI/2]} material={postMaterial}>
        <cylinderGeometry args={[postWidth/2, postWidth/2, goalWidth, 16]} />
      </mesh>

      {/* Net */}
      {/* Back */}
      <mesh position={[0, goalHeight/2, -goalDepth]} material={netMaterial}>
        <planeGeometry args={[goalWidth, goalHeight]} />
      </mesh>
      {/* Top */}
      <mesh position={[0, goalHeight, -goalDepth/2]} rotation={[Math.PI/2, 0, 0]} material={netMaterial}>
        <planeGeometry args={[goalWidth, goalDepth]} />
      </mesh>
      {/* Sides */}
      <mesh position={[-goalWidth/2, goalHeight/2, -goalDepth/2]} rotation={[0, Math.PI/2, 0]} material={netMaterial}>
        <planeGeometry args={[goalDepth, goalHeight]} />
      </mesh>
      <mesh position={[goalWidth/2, goalHeight/2, -goalDepth/2]} rotation={[0, Math.PI/2, 0]} material={netMaterial}>
        <planeGeometry args={[goalDepth, goalHeight]} />
      </mesh>
    </group>
  );
}

// Main Game Component
function Game() {
  const [keys, setKeys] = useState<{ w: boolean; a: boolean; s: boolean; d: boolean; space: boolean; sprint: boolean }>({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    sprint: false,
  });
  const [joystickMove, setJoystickMove] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ballVelocity, setBallVelocity] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [goalScored, setGoalScored] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [powerLevel, setPowerLevel] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [gameMode, setGameMode] = useState<'timed' | 'practice'>('timed');
  const [goalMessage, setGoalMessage] = useState('');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    setIsMobile(mediaQuery.matches);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'shift') setKeys((k) => ({ ...k, sprint: true }));
      else if (key === ' ') setKeys((k) => ({ ...k, space: true }));
      else if (['w', 'a', 's', 'd'].includes(key)) setKeys((k) => ({ ...k, [key]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'shift') setKeys((k) => ({ ...k, sprint: false }));
      else if (key === ' ') setKeys((k) => ({ ...k, space: false }));
      else if (['w', 'a', 's', 'd'].includes(key)) setKeys((k) => ({ ...k, [key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const gameLength =
        gameMode === 'practice'
          ? Infinity
          : difficulty === 'easy'
          ? 90
          : difficulty === 'medium'
          ? 60
          : 45;

      const timer = setInterval(() => {
        setTime((t) => {
          if (t >= gameLength && gameMode !== 'practice') {
            setGameOver(true);
            return t;
          }
          return t + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, gameOver, difficulty, gameMode]);

  useEffect(() => {
    if (goalScored) {
      const messages = [
        "Rocket Shot Scores!",
        "Net Ripper!",
        "Unstoppable Strike!",
        "Goal Machine!",
        "Precision Perfection!",
      ];
      setGoalMessage(messages[Math.floor(Math.random() * messages.length)]);

      const timeout = setTimeout(() => {
        setGoalScored(false);
        setBallVelocity({ x: 0, z: 0 });
        setScore((s) => s); // Score already incremented in GameLogic
        setGoalMessage('');
      }, 3000); // Reset after 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [goalScored]);

  const resetGame = () => {
    setScore(0);
    setTime(0);
    setGameOver(false);
    setGameStarted(true);
    setBallVelocity({ x: 0, z: 0 });
    setStamina(100);
    setPowerLevel(0);
  };

  const startScreenStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center' as const,
    color: 'white',
    background: 'rgba(0,0,0,0.7)',
    padding: isMobile ? '15px' : '20px',
    borderRadius: '10px',
    width: isMobile ? '90%' : '80%',
    maxWidth: isMobile ? 'none' : '500px',
    fontSize: isMobile ? '16px' : 'inherit',
  };

  return (
    <>
      <Canvas gl={{ antialias: false, powerPreference: 'low-power' }} camera={{ position: [0, 5, 10], fov: 75 }}>
      <GameLogic
  gameStarted={gameStarted}
  gameOver={gameOver}
  keys={keys}
  joystickMove={joystickMove}
  setBallVelocity={setBallVelocity}
  setScore={setScore}
  goalScored={goalScored} 
  setGoalScored={setGoalScored}
  setKeys={setKeys}
  setPowerLevel={setPowerLevel}
  setStamina={setStamina}
  isMobile={isMobile}
/>
      </Canvas>

      {gameStarted && !gameOver && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            color: 'white',
            fontFamily: 'Arial',
            fontSize: isMobile ? '16px' : '20px',
            background: 'rgba(0,0,0,0.5)',
            padding: '10px',
            borderRadius: '5px',
          }}
        >
          <p>Score: {score}</p>
          <p>
            Time:{' '}
            {gameMode === 'practice'
              ? time
              : time + 's / ' + (difficulty === 'easy' ? '90s' : difficulty === 'medium' ? '60s' : '45s')}
          </p>
          <div style={{ width: '100%', background: '#444', height: '10px', borderRadius: '5px', marginTop: '5px' }}>
            <div
              style={{
                width: `${stamina}%`,
                background: stamina > 30 ? '#4CAF50' : '#f44336',
                height: '100%',
                borderRadius: '5px',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>Stamina</p>
          {powerLevel > 0 && (
            <>
              <div style={{ width: '100%', background: '#444', height: '10px', borderRadius: '5px', marginTop: '5px' }}>
                <div style={{ width: `${powerLevel}%`, background: '#FFC107', height: '100%', borderRadius: '5px' }} />
              </div>
              <p style={{ fontSize: '12px', margin: '2px 0' }}>Power</p>
            </>
          )}
        </div>
      )}

      {goalScored && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: isMobile ? '40px' : '50px',
            color: 'white',
            textShadow: '0 0 10px #FFC107',
            animation: 'pulse 1s infinite',
            textAlign: 'center' as const,
          }}
        >
          {goalMessage}
        </div>
      )}

      {!gameStarted && (
        <div style={startScreenStyle}>
          <h1 style={{ color: '#4CAF50', textShadow: '0 0 5px #fff', fontSize: isMobile ? '24px' : '32px' }}>
            Striker's Duel
          </h1>
          <div style={{ margin: '15px 0' }}>
            <p><strong>Controls:</strong></p>
            <p>Move: {isMobile ? 'Joystick' : 'W/A/S/D'}</p>
            <p>Sprint: {isMobile ? 'Sprint Button' : 'Hold Shift'}</p>
            <p>Power Kick: {isMobile ? 'Kick Button (Hold)' : 'Hold Space (Release to kick)'}</p>
          </div>
          <div style={{ margin: '15px 0', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <div>
              <p><strong>Game Mode:</strong></p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setGameMode('timed')}
                  style={{
                    background: gameMode === 'timed' ? '#4CAF50' : '#555',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '5px 10px',
                    borderRadius: '5px',
                    fontSize: isMobile ? '14px' : '16px',
                  }}
                >
                  Timed Match
                </button>
                <button
                  onClick={() => setGameMode('practice')}
                  style={{
                    background: gameMode === 'practice' ? '#4CAF50' : '#555',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '5px 10px',
                    borderRadius: '5px',
                    fontSize: isMobile ? '14px' : '16px',
                  }}
                >
                  Practice
                </button>
              </div>
            </div>
          </div>
          {gameMode === 'timed' && (
            <div style={{ margin: '15px 0' }}>
              <p><strong>Difficulty:</strong></p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setDifficulty('easy')}
                  style={{
                    background: difficulty === 'easy' ? '#4CAF50' : '#555',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '5px 10px',
                    borderRadius: '5px',
                    fontSize: isMobile ? '14px' : '16px',
                  }}
                >
                  Easy (90s)
                </button>
                <button
                  onClick={() => setDifficulty('medium')}
                  style={{
                    background: difficulty === 'medium' ? '#4CAF50' : '#555',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '5px 10px',
                    borderRadius: '5px',
                    fontSize: isMobile ? '14px' : '16px',
                  }}
                >
                  Medium (60s)
                </button>
                <button
                  onClick={() => setDifficulty('hard')}
                  style={{
                    background: difficulty === 'hard' ? '#4CAF50' : '#555',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '5px 10px',
                    borderRadius: '5px',
                    fontSize: isMobile ? '14px' : '16px',
                  }}
                >
                  Hard (45s)
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => setGameStarted(true)}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: isMobile ? '12px 24px' : '10px 20px',
              borderRadius: '5px',
              fontSize: isMobile ? '16px' : '18px',
              marginTop: '15px',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {gameOver && (
        <div style={startScreenStyle}>
          <h1 style={{ color: '#4CAF50', textShadow: '0 0 5px #fff', fontSize: isMobile ? '24px' : '32px' }}>
            Game Over!
          </h1>
          <p style={{ fontSize: isMobile ? '20px' : '24px', margin: '15px 0' }}>Final Score: {score}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={resetGame}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: isMobile ? '10px 20px' : '10px 20px',
                borderRadius: '5px',
                fontSize: isMobile ? '14px' : '16px',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
            <button
              onClick={() => {
                setGameStarted(false);
                setGameOver(false);
              }}
              style={{
                background: '#555',
                color: 'white',
                border: 'none',
                padding: isMobile ? '10px 20px' : '10px 20px',
                borderRadius: '5px',
                fontSize: isMobile ? '14px' : '16px',
                cursor: 'pointer',
              }}
            >
              Main Menu
            </button>
          </div>
        </div>
      )}

      {isMobile && gameStarted && !gameOver && (
        <>
          <div className="joystick-container" style={{ position: 'absolute', bottom: 20, left: 20 }}>
            <Joystick
              size={120}
              move={(e) => {
                if (e.x !== null && e.y !== null) {
                  setJoystickMove({ x: e.x / 60, y: e.y / 60 });
                }
              }}
              stop={() => setJoystickMove({ x: 0, y: 0 })}
            />
          </div>
          <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', gap: '15px' }}>
            <button
              className="sprint-button"
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                fontSize: '14px',
              }}
              onTouchStart={() => setKeys((k) => ({ ...k, sprint: true }))}
              onTouchEnd={() => setKeys((k) => ({ ...k, sprint: false }))}
            >
              Sprint
            </button>
            <button
              className="kick-button"
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: '#F44336',
                color: 'white',
                border: 'none',
                fontSize: '14px',
              }}
              onTouchStart={() => setKeys((k) => ({ ...k, space: true }))}
              onTouchEnd={() => setKeys((k) => ({ ...k, space: false }))}
            >
              Kick
            </button>
          </div>
        </>
      )}

      <style>
        {`
          @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); }
          }
        `}
      </style>
    </>
  );
}

export default Game;