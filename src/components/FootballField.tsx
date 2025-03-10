import React from 'react';


interface FootballFieldProps {
    width?: number;
    length?: number;
}

const FootballField: React.FC<FootballFieldProps> = ({ 
    width = 50, 
    length = 30 
}) => {
    // Field dimensions
    const centerCircleRadius = 5;
    const penaltyBoxWidth = 16;
    const penaltyBoxLength = 8;
    const goalBoxWidth = 8;
    const goalBoxLength = 4;
    const penaltySpotDistance = 6;
    const lineWidth = 0.1;
    const cornerArcRadius = 1;

    const renderLine = (start: [number, number], end: [number, number]) => {
        const length = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
        const angle = Math.atan2(end[0] - start[0], end[1] - start[1]);
        const centerX = (start[0] + end[0]) / 2;
        const centerZ = (start[1] + end[1]) / 2;
        
        return (
            <mesh 
                position={[centerX, 0.01, centerZ]} 
                rotation={[0, angle, 0]}
            >
                <planeGeometry args={[length, lineWidth]} />
                <meshBasicMaterial color="white" />
            </mesh>
        );
    };

    return (
        <group>
            {/* Main field with simple green color */}
            <mesh 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0, 0]} 
                userData={{ friction: 0.8, fieldSurface: true }}
            >
                <planeGeometry args={[width, length]} />
                <meshBasicMaterial color="#4CAF50" />
            </mesh>

            {/* Field boundary lines */}
            <group position={[0, 0, 0]}>
                {/* Outer boundary */}
                {renderLine([-width/2, -length/2], [width/2, -length/2])}
                {renderLine([width/2, -length/2], [width/2, length/2])}
                {renderLine([width/2, length/2], [-width/2, length/2])}
                {renderLine([-width/2, length/2], [-width/2, -length/2])}

                {/* Center line */}
                {renderLine([0, -length/2], [0, length/2])}

                {/* Center circle */}
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[centerCircleRadius - lineWidth/2, centerCircleRadius + lineWidth/2, 32]} />
                    <meshBasicMaterial color="white" />
                </mesh>

                {/* Center spot */}
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[lineWidth, 16]} />
                    <meshBasicMaterial color="white" />
                </mesh>

                {/* Penalty boxes */}
                {/* Left penalty box */}
                <group position={[-width/2, 0, 0]}>
                    {renderLine([0, -penaltyBoxWidth/2], [penaltyBoxLength, -penaltyBoxWidth/2])}
                    {renderLine([penaltyBoxLength, -penaltyBoxWidth/2], [penaltyBoxLength, penaltyBoxWidth/2])}
                    {renderLine([penaltyBoxLength, penaltyBoxWidth/2], [0, penaltyBoxWidth/2])}
                </group>

                {/* Right penalty box */}
                <group position={[width/2, 0, 0]}>
                    {renderLine([0, -penaltyBoxWidth/2], [-penaltyBoxLength, -penaltyBoxWidth/2])}
                    {renderLine([-penaltyBoxLength, -penaltyBoxWidth/2], [-penaltyBoxLength, penaltyBoxWidth/2])}
                    {renderLine([-penaltyBoxLength, penaltyBoxWidth/2], [0, penaltyBoxWidth/2])}
                </group>

                {/* Goal boxes */}
                {/* Left goal box */}
                <group position={[-width/2, 0, 0]}>
                    {renderLine([0, -goalBoxWidth/2], [goalBoxLength, -goalBoxWidth/2])}
                    {renderLine([goalBoxLength, -goalBoxWidth/2], [goalBoxLength, goalBoxWidth/2])}
                    {renderLine([goalBoxLength, goalBoxWidth/2], [0, goalBoxWidth/2])}
                </group>

                {/* Right goal box */}
                <group position={[width/2, 0, 0]}>
                    {renderLine([0, -goalBoxWidth/2], [-goalBoxLength, -goalBoxWidth/2])}
                    {renderLine([-goalBoxLength, -goalBoxWidth/2], [-goalBoxLength, goalBoxWidth/2])}
                    {renderLine([-goalBoxLength, goalBoxWidth/2], [0, goalBoxWidth/2])}
                </group>

                {/* Penalty spots */}
                <mesh position={[-width/2 + penaltySpotDistance, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[lineWidth, 16]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                <mesh position={[width/2 - penaltySpotDistance, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[lineWidth, 16]} />
                    <meshBasicMaterial color="white" />
                </mesh>

                {/* Penalty arcs */}
                <mesh position={[-width/2 + penaltySpotDistance, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[centerCircleRadius - lineWidth/2, centerCircleRadius + lineWidth/2, 32, 1, Math.PI/2, Math.PI]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                <mesh position={[width/2 - penaltySpotDistance, 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI]}>
                    <ringGeometry args={[centerCircleRadius - lineWidth/2, centerCircleRadius + lineWidth/2, 32, 1, Math.PI/2, Math.PI]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                
                {/* Corner arcs */}
                <mesh position={[-width/2, -length/2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[cornerArcRadius - lineWidth/2, cornerArcRadius + lineWidth/2, 16, 1, 0, Math.PI/2]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                <mesh position={[width/2, -length/2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[cornerArcRadius - lineWidth/2, cornerArcRadius + lineWidth/2, 16, 1, Math.PI/2, Math.PI]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                <mesh position={[width/2, length/2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[cornerArcRadius - lineWidth/2, cornerArcRadius + lineWidth/2, 16, 1, Math.PI, Math.PI*1.5]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                <mesh position={[-width/2, length/2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[cornerArcRadius - lineWidth/2, cornerArcRadius + lineWidth/2, 16, 1, Math.PI*1.5, Math.PI*2]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                
                {/* Simple goals */}
                <group position={[-width/2 - 1, 0.5, 0]}>
                    <mesh>
                        <boxGeometry args={[0.2, 1, goalBoxWidth]} />
                        <meshBasicMaterial color="#E0E0E0" />
                    </mesh>
                </group>
                
                <group position={[width/2 + 1, 0.5, 0]}>
                    <mesh>
                        <boxGeometry args={[0.2, 1, goalBoxWidth]} />
                        <meshBasicMaterial color="#E0E0E0" />
                    </mesh>
                </group>
            </group>
        </group>
    );
};

export default FootballField;