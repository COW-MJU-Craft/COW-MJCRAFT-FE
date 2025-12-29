import axios from 'axios';

const instance = axios.create({
  // 프록시 설정 O -> '/api'만 적으면 Vite가 알아서 타겟 주소와 합쳐줌
  baseURL: '/api',
  timeout: 5000,
});

export default instance;
