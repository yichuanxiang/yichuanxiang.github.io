// Keep only the three official definitions used by the blog.
import MeshGradient from 'shaders/core/MeshGradient';
import LightLeak from 'shaders/core/LightLeak';
import Godrays from 'shaders/core/Godrays';
const shaderRegistry = Object.fromEntries([MeshGradient, LightLeak, Godrays].map(definition => [definition.name, { name: definition.name, category: definition.category, definition }]));
export const getAllShaders = () => Object.values(shaderRegistry);
const getShaderByName = name => shaderRegistry[name];
const getShadersByCategory = category => Object.values(shaderRegistry).filter(entry => entry.category === category);
const getShaderCategories = () => [...new Set(Object.values(shaderRegistry).map(entry => entry.category))];
export { shaderRegistry as a, getShadersByCategory as i, getShaderByName as n, getShaderCategories as r, getAllShaders as t };
