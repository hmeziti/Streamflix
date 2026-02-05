
/**
 * CLOUDFLARE WORKER - PROXY STREAMING ULTRA-PERFORMANT
 */

import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_DRIVE_API_KEY?: string; 
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // ROUTE: /api/play/:slug
    if (path.startsWith('/api/play/')) {
      const slug = path.split('/').pop();
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: video, error } = await supabase
        .from('videos')
        .select('video_key, source_type')
        .eq('slug', slug)
        .single();

      if (!video || error) return new Response('Video not found in database', { status: 404, headers: corsHeaders });

      if (video.source_type === 'drive') {
        const driveId = video.video_key;
        // On construit l'URL de l'API Google Drive pour le contenu brut
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media${env.GOOGLE_DRIVE_API_KEY ? `&key=${env.GOOGLE_DRIVE_API_KEY}` : ''}`;
        
        // On transfère le header Range du navigateur vers Google pour permettre le seeking
        const rangeHeader = request.headers.get('Range');
        
        const driveRes = await fetch(driveUrl, {
          headers: rangeHeader ? { 'Range': rangeHeader } : {}
        });

        // On clone la réponse et on injecte les headers CORS pour le lecteur HTML5
        const newRes = new Response(driveRes.body, driveRes);
        Object.entries(corsHeaders).forEach(([k, v]) => newRes.headers.set(k, v));
        
        // Important: S'assurer que le status 206 (Partial Content) est préservé pour le streaming
        return newRes;
      }

      return new Response('Source type not supported by proxy', { status: 400, headers: corsHeaders });
    }

    return new Response('StreamFLIX API Proxy Active', { status: 200, headers: corsHeaders });
  }
};
