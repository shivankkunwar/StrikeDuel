import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerCharacterProps {
    isMoving: boolean;
    isKicking: boolean;
    isRunning: boolean;
    color?: string;
    teamNumber?: number;
    isGoalkeeper?: boolean;
}

const PlayerCharacter: React.FC<PlayerCharacterProps> = ({
    isMoving,
    isKicking,
    isRunning,
    color = '#2196f3',
    //teamNumber = 10,
    isGoalkeeper = false
}) => {
    // Body part refs
    const torso = useRef<THREE.Mesh>(null);
    const head = useRef<THREE.Mesh>(null);
    const legL = useRef<THREE.Mesh>(null);
    const legR = useRef<THREE.Mesh>(null);
    const armL = useRef<THREE.Mesh>(null);
    const armR = useRef<THREE.Mesh>(null);
    const footL = useRef<THREE.Mesh>(null);
    const footR = useRef<THREE.Mesh>(null);

    // Animation controls
    const runCycle = useRef(0);
    const kickCycle = useRef(0);
    const breatheCycle = useRef(0);

    // Color utilities
    const getContrastColor = (): string => {
        if (isGoalkeeper) return '#FF9800';
        return color === '#2196f3' ? '#ffffff' : '#000000';
    };

    const getShortsColor = (): string => {
        if (isGoalkeeper) return '#424242';
        return color === '#2196f3' ? '#0D47A1' : '#8B0000';
    };

    const getSocksColor = (): string => {
        if (isGoalkeeper) return '#BDBDBD';
        return color;
    };

  
    useFrame((_, delta) => {
        // Breathing animation
        breatheCycle.current += delta;
        if (torso.current) {
            torso.current.scale.y = 1 + Math.sin(breatheCycle.current) * 0.02;
        }

        // Head movement
        if (head.current && !isMoving) {
            head.current.rotation.y = Math.sin(breatheCycle.current * 0.5) * 0.1;
        }

        // Movement animations
        if (isMoving) {
            runCycle.current += delta * (isRunning ? 12 : 8);
            
            if (legL.current && legR.current) {
                legL.current.rotation.x = Math.sin(runCycle.current) * 0.8;
                legR.current.rotation.x = Math.sin(runCycle.current + Math.PI) * 0.8;
            }

            if (footL.current && footR.current) {
                footL.current.rotation.x = Math.sin(runCycle.current + Math.PI) * 0.5;
                footR.current.rotation.x = Math.sin(runCycle.current) * 0.5;
            }

            if (armL.current && armR.current) {
                armL.current.rotation.x = Math.sin(runCycle.current + Math.PI) * 0.6;
                armR.current.rotation.x = Math.sin(runCycle.current) * 0.6;
            }
        }

        // Kicking animation
        if (isKicking) {
            kickCycle.current += delta * 15;
            if (kickCycle.current < Math.PI) {
                if (legR.current) {
                    legR.current.rotation.x = -Math.sin(kickCycle.current) * 1.5;
                }
            } else {
                kickCycle.current = 0;
            }
        }
    });

    return (
        <group>
            {/* Torso */}
            <mesh ref={torso} position={[0, 1.2, 0]}>
                <capsuleGeometry args={[0.25, 0.8, 8, 16]} />
                <meshStandardMaterial color={color} />
                
                {/* Player number on back */}
                <mesh position={[0, 0, -0.26]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[0.3, 0.3]} />
                    <meshStandardMaterial color={getContrastColor()} />
                </mesh>
            </mesh>

            {/* Shorts */}
            <mesh position={[0, 0.8, 0]}>
                <capsuleGeometry args={[0.2, 0.3, 8, 16]} />
                <meshStandardMaterial color={getShortsColor()} />
            </mesh>

            {/* Head with simple face */}
            <group>
                <mesh ref={head} position={[0, 2, 0]}>
                    <sphereGeometry args={[0.22, 16, 16]} />
                    <meshStandardMaterial color="#FFD700" /> {/* Skin tone */}
                </mesh>
                
                {/* Simple hair */}
                <mesh position={[0, 2.15, 0]}>
                    <sphereGeometry args={[0.17, 16, 16]} />
                    <meshStandardMaterial color="#3E2723" />
                </mesh>
                
                {/* Eyes */}
                <mesh position={[0.07, 2.05, 0.15]} rotation={[0, 0, 0]}>
                    <planeGeometry args={[0.05, 0.03]} />
                    <meshStandardMaterial color="#000000" />
                </mesh>
                <mesh position={[-0.07, 2.05, 0.15]} rotation={[0, 0, 0]}>
                    <planeGeometry args={[0.05, 0.03]} />
                    <meshStandardMaterial color="#000000" />
                </mesh>
            </group>

            {/* Left Leg */}
            <group position={[0.12, 0.7, 0]}>
                <mesh ref={legL} position={[0, -0.25, 0]}>
                    <capsuleGeometry args={[0.09, 0.5, 8, 16]} />
                    <meshStandardMaterial color="#FFD700" /> {/* Skin tone */}
                </mesh>
                
                {/* Left Sock */}
                <mesh position={[0, -0.6, 0]}>
                    <capsuleGeometry args={[0.08, 0.2, 8, 16]} />
                    <meshStandardMaterial color={getSocksColor()} />
                </mesh>
                
                {/* Left Foot/Boot */}
                <mesh ref={footL} position={[0, -0.8, 0.05]}>
                    <boxGeometry args={[0.12, 0.1, 0.25]} />
                    <meshStandardMaterial color="#111111" />
                </mesh>
            </group>

            {/* Right Leg */}
            <group position={[-0.12, 0.7, 0]}>
                <mesh ref={legR} position={[0, -0.25, 0]}>
                    <capsuleGeometry args={[0.09, 0.5, 8, 16]} />
                    <meshStandardMaterial color="#FFD700" /> {/* Skin tone */}
                </mesh>
                
                {/* Right Sock */}
                <mesh position={[0, -0.6, 0]}>
                    <capsuleGeometry args={[0.08, 0.2, 8, 16]} />
                    <meshStandardMaterial color={getSocksColor()} />
                </mesh>
                
                {/* Right Foot/Boot */}
                <mesh ref={footR} position={[0, -0.8, 0.05]}>
                    <boxGeometry args={[0.12, 0.1, 0.25]} />
                    <meshStandardMaterial color="#111111" />
                </mesh>
            </group>

            {/* Left Arm */}
            <group position={[0.32, 1.5, 0]}>
                <mesh ref={armL} position={[0, -0.25, 0]}>
                    <capsuleGeometry args={[0.06, 0.5, 8, 16]} />
                    <meshStandardMaterial color={color} />
                </mesh>
                
                {/* Left Hand */}
                <mesh position={[0, -0.55, 0]}>
                    <sphereGeometry args={[0.06, 8, 8]} />
                    <meshStandardMaterial color="#FFD700" /> {/* Skin tone */}
                </mesh>
            </group>

            {/* Right Arm */}
            <group position={[-0.32, 1.5, 0]}>
                <mesh ref={armR} position={[0, -0.25, 0]}>
                    <capsuleGeometry args={[0.06, 0.5, 8, 16]} />
                    <meshStandardMaterial color={color} />
                </mesh>
                
                {/* Right Hand */}
                <mesh position={[0, -0.55, 0]}>
                    <sphereGeometry args={[0.06, 8, 8]} />
                    <meshStandardMaterial color="#FFD700" /> {/* Skin tone */}
                </mesh>
            </group>
            
            {/* Jersey Number on Front */}
            <mesh position={[0, 1.3, 0.26]} rotation={[0, 0, 0]}>
                <planeGeometry args={[0.18, 0.18]} />
                <meshStandardMaterial color={getContrastColor()} />
            </mesh>
            
            {/* Display player number */}
            {/* <mesh position={[0, 1.3, 0.262]} rotation={[0, 0, 0]}>
                <TextGeometry args={[
                    teamNumber.toString(),
                    {
                        font: font,
                        size: 0.1,
                        height: 0.01
                    }
                ]} />
                <meshStandardMaterial color={color} />
            </mesh> */}
        </group>
    );
};

export default PlayerCharacter;