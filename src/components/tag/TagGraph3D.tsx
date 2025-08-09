'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  cluster_id: number;
  weight: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

interface TagGraphData {
  nodes: Node[];
  edges: Edge[];
  clusters: Record<number, string[]>;
}

interface TagGraph3DProps {
  data: TagGraphData;
  onTagClick?: (tagId: string, tagName: string) => void;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function TagGraph3D({
  data,
  onTagClick,
  width = '100%',
  height = '600px',
  className = ''
}: TagGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  // 노드 참조 저장용 (인터랙션을 위해)
  const nodesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const labelsRef = useRef<Map<string, CSS2DObject>>(new Map());
  
  // 활성화된 태그
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  
  // 초기화 및 그래프 렌더링
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 렌더러 초기화
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    // 배경색을 연한 회색으로 설정하여 영역을 명확히 구분
    renderer.setClearColor(0xf8f9fa, 1);
    rendererRef.current = renderer;
    
    // CSS2D 라벨 렌더러 초기화
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRendererRef.current = labelRenderer;
    
    // 장면 초기화
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // 카메라 초기화
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // 컨트롤 초기화
    const controls = new OrbitControls(camera, labelRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controlsRef.current = controls;
    
    // 렌더러 DOM에 추가
    containerRef.current.appendChild(renderer.domElement);
    containerRef.current.appendChild(labelRenderer.domElement);
    
    // 조명 추가
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // 그래프 크기에 맞게 렌더러 크기 조정
    const updateSize = () => {
      if (!containerRef.current || !renderer || !camera || !labelRenderer) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    
    // 초기 크기 설정
    updateSize();
    
    // 애니메이션 루프
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      if (labelRendererRef.current && sceneRef.current && cameraRef.current) {
        labelRendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    // 애니메이션 시작
    animate();
    
    // 창 크기 변경 이벤트 리스너
    window.addEventListener('resize', updateSize);
    
    // 클린업
    return () => {
      window.removeEventListener('resize', updateSize);
      
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
        containerRef.current.removeChild(labelRenderer.domElement);
      }
      
      // 메모리 정리
      scene.clear();
      renderer.dispose();
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, []);
  
  // 그래프 데이터가 변경되면 장면 업데이트
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // 기존 노드 제거
    nodesRef.current.forEach((node) => {
      sceneRef.current?.remove(node);
    });
    
    labelsRef.current.forEach((label) => {
      sceneRef.current?.remove(label);
    });
    
    nodesRef.current.clear();
    labelsRef.current.clear();
    
    // 클러스터 색상 맵 생성
    const clusterColors: Record<number, THREE.Color> = {
      0: new THREE.Color(0x3182CE), // blue
      1: new THREE.Color(0x38A169), // green
      2: new THREE.Color(0xDD6B20), // orange
      3: new THREE.Color(0xE53E3E), // red
      4: new THREE.Color(0x805AD5)  // purple
    };
    
    // 노드 생성
    data.nodes.forEach((node) => {
      // 노드 크기는 가중치에 비례
      const radius = 0.05 + (node.weight * 0.15);
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      
      // 클러스터에 따른 색상 설정
      const color = clusterColors[node.cluster_id] || new THREE.Color(0xCCCCCC);
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.8,
        shininess: 30
      });
      
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(node.x * 4, node.y * 4, node.z * 4); // 위치 스케일링
      
      // 상호작용을 위한 사용자 데이터 저장
      sphere.userData = { id: node.id, name: node.name };
      
      sceneRef.current?.add(sphere);
      nodesRef.current.set(node.id, sphere);
      
      // 태그 라벨 생성
      const labelDiv = document.createElement('div');
      labelDiv.className = 'bg-white px-2 py-1 rounded-md text-xs font-light text-notion-black border border-notion-gray-200 shadow-sm';
      labelDiv.textContent = node.name;
      labelDiv.style.pointerEvents = 'auto';
      labelDiv.style.cursor = 'pointer';
      
      // 라벨 클릭 이벤트
      labelDiv.addEventListener('click', () => {
        if (onTagClick) {
          onTagClick(node.id, node.name);
          setActiveTagId(node.id);
        }
      });
      
      const label = new CSS2DObject(labelDiv);
      label.position.set(node.x * 4, node.y * 4 + radius + 0.2, node.z * 4);
      sceneRef.current?.add(label);
      labelsRef.current.set(node.id, label);
    });
    
    // 엣지 생성
    data.edges.forEach((edge) => {
      const sourceNode = nodesRef.current.get(edge.source);
      const targetNode = nodesRef.current.get(edge.target);
      
      if (sourceNode && targetNode) {
        const sourcePos = sourceNode.position;
        const targetPos = targetNode.position;
        
        const points = [
          new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z),
          new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // 엣지 두께와 투명도는 관계 강도에 비례
        const lineWidth = Math.max(0.5, edge.strength * 3);
        const opacity = Math.max(0.2, edge.strength * 0.8);
        
        const material = new THREE.LineBasicMaterial({ 
          color: 0xAAAAAA,
          transparent: true,
          opacity: opacity,
          linewidth: lineWidth
        });
        
        const line = new THREE.Line(geometry, material);
        sceneRef.current?.add(line);
      }
    });
    
  }, [data, onTagClick]);
  
  // 활성 태그가 변경되면 강조 효과 적용
  useEffect(() => {
    nodesRef.current.forEach((node, id) => {
      const material = node.material as THREE.MeshPhongMaterial;
      
      if (activeTagId === id) {
        // 활성 태그 강조
        material.emissive = new THREE.Color(0xFFFFFF);
        material.emissiveIntensity = 0.3;
        node.scale.set(1.2, 1.2, 1.2);
      } else if (activeTagId === null) {
        // 모든 태그 기본 상태
        material.emissive = new THREE.Color(0x000000);
        material.emissiveIntensity = 0;
        node.scale.set(1, 1, 1);
      } else {
        // 비활성 태그는 약간 흐리게
        material.emissive = new THREE.Color(0x000000);
        material.emissiveIntensity = 0;
        material.opacity = 0.5;
        node.scale.set(1, 1, 1);
      }
    });
    
    // 라벨도 활성 상태에 따라 스타일 변경
    labelsRef.current.forEach((label, id) => {
      const div = label.element as HTMLDivElement;
      
      if (activeTagId === id) {
        div.className = 'bg-notion-blue bg-opacity-10 px-2 py-1 rounded-md text-xs font-normal text-notion-blue border border-notion-blue shadow-sm';
      } else {
        div.className = 'bg-white px-2 py-1 rounded-md text-xs font-light text-notion-black border border-notion-gray-200 shadow-sm';
      }
    });
  }, [activeTagId]);
  
  return (
    <div 
      ref={containerRef} 
      className={`relative bg-notion-gray-50 border border-notion-gray-200 rounded-md ${className}`}
      style={{ width, height }}
    >
      {/* 레전드 */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-md border border-notion-gray-200 shadow-sm z-10">
        <div className="text-sm font-light text-notion-black mb-2">클러스터</div>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#3182CE] mr-2"></div>
            <span className="text-xs text-notion-gray-700">AI/ML</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#38A169] mr-2"></div>
            <span className="text-xs text-notion-gray-700">프로그래밍</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#DD6B20] mr-2"></div>
            <span className="text-xs text-notion-gray-700">데이터 사이언스</span>
          </div>
        </div>
        <div className="text-xs text-notion-gray-700 mt-2">
          노드 크기 = 태그 빈도수
        </div>
      </div>
      
      {/* 도움말 */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-md border border-notion-gray-200 shadow-sm z-10">
        <div className="text-xs text-notion-gray-700">
          <span className="block mb-1">마우스로 드래그: 회전</span>
          <span className="block mb-1">스크롤: 확대/축소</span>
          <span className="block">태그 클릭: 관련 메모 보기</span>
        </div>
      </div>
    </div>
  );
}
