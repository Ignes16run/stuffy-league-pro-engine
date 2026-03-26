'use client';

import Typewriter from 'typewriter-effect';

export default function Typing() {
    return (
        <div className="text-stone-400 font-medium">
            <Typewriter
                options={{
                    strings: [
                        'Simulate Full Seasons', 
                        '32 Unique Stuffy Teams', 
                        'High-Fidelity Renders', 
                        'Dynamic Storyline Engine',
                        'Tournament Brackets',
                        'Real-time Stat Tracking'
                    ],
                    autoStart: true,
                    loop: true,
                    delay: 50,
                    deleteSpeed: 30,
                }}
            />
        </div>
    )
}