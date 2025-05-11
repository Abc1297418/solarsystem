import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { TextureLoader, Vector3, DoubleSide } from "three";
import { FaPlay, FaPause } from "react-icons/fa";

import sunTexture       from "./assets/sun_texture.jpg";
import mercuryTexture   from "./assets/mercury_texture.jpg";
import venusTexture     from "./assets/venus_texture.jpg";
import earthTexture     from "./assets/earth_texture.jpg";
import marsTexture      from "./assets/mars_texture.jpg";
import jupiterTexture   from "./assets/jupiter_texture.jpg";
import saturnTexture    from "./assets/saturn_texture.jpg";
import saturnRingTex    from "./assets/saturn_texture_cyrcle.png";
import uranusTexture    from "./assets/uranus_texture.jpg";
import neptuneTexture   from "./assets/neptune_texture.jpg";

/* ---------------------------- Глобальные стили ---------------------------- */
const useGlobalStyle = () => {
    useEffect(() => {
        const o = document.body.style.overflow;
        const m = document.body.style.margin;
        document.body.style.overflow = "hidden";
        document.body.style.margin = "0";
        return () => {
            document.body.style.overflow = o;
            document.body.style.margin = m;
        };
    }, []);
};

/* -------------------------- CameraController ------------------------------ */
const CameraController = ({ targetObject }) => {
    const { camera, controls } = useThree();
    const prev = useRef(null);

    useEffect(() => {
        prev.current = null;
    }, [targetObject]);

    useFrame(() => {
        if (!targetObject || !controls) return;
        const pos = targetObject.getWorldPosition(new Vector3());
        if (prev.current) camera.position.add(pos.clone().sub(prev.current));
        controls.target.copy(pos);
        controls.update();
        prev.current = pos;
    });
    return null;
};

/* ------------------------------- Planet ----------------------------------- */
const Planet = ({ planet, timeScale, spinScale, isPaused, onSelect }) => {
    const { size, texture, distance, speed, color, ringTexture, axialSpeed } = planet;
    const orbitRef   = useRef();      // группа, движущаяся по орбите
    const surfaceRef = useRef();      // сама сфера для осевого вращения

    // Загружаем только то, что действительно нужно
    const maps = useLoader(
        TextureLoader,
        ringTexture ? [texture, ringTexture] : [texture]
    );
    const surfaceMap = maps[0];
    const ringMap    = ringTexture ? maps[1] : null;

    const elapsed = useRef(0);
    const prevTime = useRef(0);

    useFrame(({ clock }) => {
        const now = clock.getElapsedTime();
        if (isPaused) {
            prevTime.current = now;
            return;
        }
        const dt = now - prevTime.current;
        prevTime.current = now;

        /* орбита */
        elapsed.current += dt * timeScale;
        const t = elapsed.current;
        const x = Math.cos(t * speed) * distance;
        const z = Math.sin(t * speed) * distance;
        orbitRef.current?.position.set(x, 0, z);

        /* собственное вращение */
        if (surfaceRef.current) {
            surfaceRef.current.rotation.y += dt * axialSpeed * spinScale;
        }
    });

    return (
        <group
            ref={orbitRef}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onSelect(orbitRef.current, planet);
            }}
        >
            <mesh ref={surfaceRef}>
                <sphereGeometry args={[size, 32, 32]} />
                <meshStandardMaterial
                    map={texture ? surfaceMap : undefined}
                    color={texture ? undefined : color}
                />
            </mesh>

            {ringMap && (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[size * 2.2, size * 3.5, 64]} />
                    <meshStandardMaterial
                        map={ringMap}
                        side={DoubleSide}
                        transparent
                    />
                </mesh>
            )}
        </group>
    );
};

/* --------------------------- Инфо‑панель ---------------------------------- */
const PlanetInfoPane = ({ planet }) => (
    <div
        style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100vh",
            width: "280px",
            background: "#1e1e1e",
            color: "white",
            padding: "24px",
            boxSizing: "border-box",
            transform: `translateX(${planet ? "0" : "100%"})`,
            transition: "transform 0.35s ease-in-out",
            boxShadow: "-3px 0 8px rgba(0,0,0,0.6)",
            zIndex: 2,
            overflowY: "auto",
        }}
    >
        {planet && (
            <>
                <h2 style={{ marginTop: 0 }}>{planet.name}</h2>
                {planet.description.split("\n").map((p, i) => (
                    <p key={i} style={{ fontSize: "0.9rem", lineHeight: 1.4 }}>
                        {p}
                    </p>
                ))}
            </>
        )}
    </div>
);

/* ---------------------------- Главный компонент --------------------------- */
export default function SolarSystem() {
    useGlobalStyle();

    const [timeScale, setTimeScale]   = useState(1); // орбитальная скорость
    const [spinScale, setSpinScale]   = useState(1); // множитель осевого вращения
    const [isPaused, setIsPaused]     = useState(false);
    const [focused, setFocused]       = useState(null);
    const [selected, setSelected]     = useState(null);

    const sunRef = useRef();
    const sunMap = useLoader(TextureLoader, sunTexture);

    // ESC возвращает фокус к Солнцу
    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") {
                setFocused(sunRef.current);
                setSelected(null);
            }
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, []);

    /* --------------------------- Данные планет ------------------------------ */
    const planets = [
        {
            id: "mercury",
            name: "Меркурий",
            size: 0.5,
            distance: 9,
            speed: 4.7,
            axialSpeed: 1.3,            // вращение вокруг оси
            texture: mercuryTexture,
            color: "gray",
            description:
                "Самая близкая к Солнцу и самая быстрая планета.\nЕё год длится всего 88 земных суток, а поверхность за день нагревается до 430 °C и остывает до −180 °C ночью.",
        },
        {
            id: "venus",
            name: "Венера",
            size: 0.8,
            distance: 18,
            speed: 3.5,
            axialSpeed: -0.3,           // отрицательное — ретроградное вращение
            texture: venusTexture,
            color: "orange",
            description:
                "Планета‑близнец Земли по размеру, но с адской атмосферой из CO₂ и серной кислоты.\nСутки на Венере длиннее её года: она вращается вокруг оси 243 земных суток, а обходит Солнце за 225.",
        },
        {
            id: "earth",
            name: "Земля",
            size: 1,
            distance: 27,
            speed: 3.0,
            axialSpeed: 2.0,
            texture: earthTexture,
            color: "blue",
            description:
                "Единственная известная обитаемая планета и дом не только людей, но миллиона видов.\n71 % поверхности покрыто океанами, которые регулируют климат и производят большую часть кислорода.",
        },
        {
            id: "mars",
            name: "Марс",
            size: 0.9,
            distance: 36,
            speed: 2.4,
            axialSpeed: 2.1,
            texture: marsTexture,
            color: "red",
            description:
                "Красную окраску Марсу придаёт оксид железа в почве.\nИмеет самую высокую гору Солнечной системы — Олимп (≈ 22 км) и возможные запасы замёрзшей воды под поверхностью.",
        },
        {
            id: "jupiter",
            name: "Юпитер",
            size: 2,
            distance: 54,
            speed: 1.3,
            axialSpeed: 4.1,
            texture: jupiterTexture,
            color: "brown",
            description:
                "Крупнейшая планета‑гигант, масса которой превышает суммарную массу всех остальных планет.\nЕго Большое Красное Пятно — шторм, бушующий минимум 350 лет.",
        },
        {
            id: "saturn",
            name: "Сатурн",
            size: 1.6,
            distance: 72,
            speed: 1.0,
            axialSpeed: 3.8,
            texture: saturnTexture,
            ringTexture: saturnRingTex,
            color: "yellow",
            description:
                "Знаменит своими яркими кольцами изо льда и пыли, растянутыми на сотни тысяч километров.\nПлотность Сатурна так мала, что будь океан достаточно велик, планета бы плавала в нём как шарик!",
        },
        {
            id: "uranus",
            name: "Уран",
            size: 1.2,
            distance: 90,
            speed: 0.7,
            axialSpeed: -1.4,
            texture: uranusTexture,
            color: "lightblue",
            description:
                "Вращается «лежачим на боку» под углом 98°, возможно из‑за древнего столкновения.\nАтмосфера содержит метан, придающий планете голубой оттенок, и ветры до 900 км/ч.",
        },
        {
            id: "neptune",
            name: "Нептун",
            size: 1,
            distance: 108,
            speed: 0.4,
            axialSpeed: 2.0,
            texture: neptuneTexture,
            color: "darkblue",
            description: `Самая дальняя планета Солнечной системы, открытая по возмущениям орбиты Урана.
Известен сверхзвуковыми ветрами до 2100 км/ч и пятнами‑шторнами, похожими на юпитерианские.`,
        },
    ];

    /* ------------------------- RENDER ------------------------- */
    return (
        <>
            <PlanetInfoPane planet={selected} />

            {/* Панель управления */}
            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    zIndex: 3,
                    color: "white",
                    display: "flex",
                    gap: 10,
                }}
            >
                <button
                    onClick={() => setIsPaused((p) => !p)}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                    }}
                >
                    {isPaused ? <FaPlay size={24} /> : <FaPause size={24} />}
                </button>

                <label>
                    Орбиты:
                    <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={timeScale}
                        onChange={(e) =>
                            setTimeScale(parseFloat(e.target.value))
                        }
                    />
                    {` ${timeScale}x`}
                </label>

                <label>
                    Вращение:
                    <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={spinScale}
                        onChange={(e) =>
                            setSpinScale(parseFloat(e.target.value))
                        }
                    />
                    {` ${spinScale}x`}
                </label>
            </div>

            {/* 3D сцена */}
            <Canvas
                camera={{ position: [0, 20, 50] }}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "black",
                }}
            >
                <CameraController targetObject={focused ?? sunRef.current} />

                <ambientLight intensity={0.8} />
                <OrbitControls makeDefault enablePan={false} />

                <Stars radius={200} depth={50} count={5000} factor={4} fade />

                {/* Солнце */}
                <mesh ref={sunRef} position={[0, 0, 0]}>
                    <sphereGeometry args={[4, 32, 32]} />
                    <meshStandardMaterial
                        map={sunMap}
                        emissiveMap={sunMap}
                        emissive="white"
                        emissiveIntensity={1.5}
                    />
                    <pointLight intensity={2.5} distance={200} decay={2} />
                </mesh>

                {/* Планеты */}
                {planets.map((p) => (
                    <Planet
                        key={p.id}
                        planet={p}
                        timeScale={timeScale}
                        spinScale={spinScale}
                        isPaused={isPaused}
                        onSelect={(mesh, data) => {
                            setFocused(mesh);
                            setSelected(data);
                        }}
                    />
                ))}
            </Canvas>
        </>
    );
}
