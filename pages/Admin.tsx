import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, HardDrive, Share2, PlayCircle, Upload, X, Pencil, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { LOCAL_THUMBNAILS } from '../constants';
import { Video } from '../types';

export const Admin = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // State pour gérer l'édition
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // État pour le fichier image
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Video>>({
    title: '',
    description: '',
    video_key: '',
    source_type: 'vidmoly',
    thumbnail_url: '',
    year: new Date().getFullYear(),
    duration: 0,
    slug: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await api.adminGetVideos();
      setVideos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette vidéo ?')) return;
    try {
      await api.adminDeleteVideo(id);
      setVideos(videos.filter(v => v.id !== id));
    } catch (e) {
      alert('Échec suppression');
    }
  };

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setFormData({
      title: video.title,
      description: video.description,
      video_key: video.video_key,
      source_type: video.source_type,
      thumbnail_url: video.thumbnail_url,
      year: video.year,
      duration: video.duration,
      slug: video.slug
    });
    setPreviewUrl(video.thumbnail_url);
    setShowForm(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setThumbnailFile(null);
    setPreviewUrl('');
    setFormData({ ...formData, thumbnail_url: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectLocalThumbnail = (thumbnailUrl: string) => {
    setThumbnailFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormData({ ...formData, thumbnail_url: thumbnailUrl });
    setPreviewUrl(thumbnailUrl);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      video_key: '',
      source_type: 'vidmoly',
      thumbnail_url: '',
      year: new Date().getFullYear(),
      duration: 0,
      slug: ''
    });
    setThumbnailFile(null);
    setPreviewUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalThumbnailUrl = formData.thumbnail_url;

    // Si un fichier a été sélectionné, on simule l'upload d'abord
    if (thumbnailFile) {
      setUploadingImage(true);
      try {
        finalThumbnailUrl = await api.uploadThumbnail(thumbnailFile);
      } catch (error) {
        alert("Erreur lors de l'upload de l'image");
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    }

    if (!finalThumbnailUrl) {
      alert("Veuillez fournir une URL de miniature ou uploader une image.");
      return;
    }

    try {
      const videoData = {
        ...formData,
        thumbnail_url: finalThumbnailUrl
      };

      if (editingId) {
        // Mode Édition
        await api.adminUpdateVideo(editingId, videoData);
        setVideos(videos.map(v => v.id === editingId ? { ...v, ...videoData } as Video : v));
        alert('Vidéo modifiée avec succès !');
      } else {
        // Mode Création
        const newVideo = await api.adminCreateVideo(videoData);
        // Si on est en mock, on ajoute artificiellement à la liste pour l'UX
        if (!newVideo) {
            // Fallback mock
             const mockVideo = { ...videoData, id: Math.random().toString(36).substr(2, 9) } as Video;
             setVideos([mockVideo, ...videos]);
        } else {
            setVideos([newVideo, ...videos]);
        }
        alert('Vidéo ajoutée au catalogue !');
      }
      
      resetForm();
      // On recharge pour être sûr (optionnel si on gère bien le state local)
      // loadVideos();
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="bg-[#141414] border-b border-gray-800 p-4 sticky top-0 z-20 flex justify-between items-center">
         <div className="flex items-center gap-4">
             <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
                 <ArrowLeft />
             </button>
             <h1 className="text-xl font-bold text-white">Console Admin</h1>
         </div>
         <div className="flex gap-3">
             <button 
                onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-red-700 font-bold"
             >
                <Plus className="w-4 h-4" />
                Ajouter
             </button>
         </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
         {loading ? (
             <div className="text-center text-gray-400 mt-20">Chargement...</div>
         ) : (
             <div className="bg-[#2f2f2f] rounded-lg overflow-hidden">
                 <table className="w-full text-left text-sm text-gray-300">
                     <thead className="bg-[#1f1f1f] text-gray-400 uppercase font-medium">
                         <tr>
                             <th className="p-4">Miniature</th>
                             <th className="p-4">Source</th>
                             <th className="p-4">Titre</th>
                             <th className="p-4">ID / Clé</th>
                             <th className="p-4">Année</th>
                             <th className="p-4 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-700">
                         {videos.map(video => (
                             <tr key={video.id} className="hover:bg-[#3f3f3f]">
                                 <td className="p-4 w-24">
                                     <img src={video.thumbnail_url} alt="" className="w-16 h-10 object-cover rounded" />
                                 </td>
                                 <td className="p-4">
                                     {video.source_type === 'vidmoly' ? (
                                         <div className="flex items-center gap-2 text-purple-400">
                                             <PlayCircle className="w-4 h-4" /> VidMoly
                                         </div>
                                     ) : video.source_type === 'drive' ? (
                                         <div className="flex items-center gap-2 text-blue-400">
                                             <Share2 className="w-4 h-4" /> Drive
                                         </div>
                                     ) : (
                                         <div className="flex items-center gap-2 text-green-400">
                                             <HardDrive className="w-4 h-4" /> R2
                                         </div>
                                     )}
                                 </td>
                                 <td className="p-4 font-bold text-white">{video.title}</td>
                                 <td className="p-4 font-mono text-xs text-gray-400 truncate max-w-[150px]">{video.video_key}</td>
                                 <td className="p-4">{video.year}</td>
                                 <td className="p-4 text-right">
                                     <div className="flex justify-end gap-2">
                                        <button 
                                          onClick={() => handleEdit(video)} 
                                          className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded"
                                          title="Modifier"
                                        >
                                           <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(video.id)} 
                                          className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded"
                                          title="Supprimer"
                                        >
                                           <Trash2 className="w-4 h-4" />
                                        </button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
      </div>

      {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-[#1f1f1f] p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800">
                  <h2 className="text-2xl font-bold mb-6">
                    {editingId ? 'Modifier la vidéo' : 'Ajouter une vidéo'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      
                      {/* UPLOAD SECTION */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Miniature</label>
                        <div 
                          className={`relative border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors ${previewUrl ? 'border-primary bg-black/50' : 'border-gray-600 hover:border-gray-400 hover:bg-[#2a2a2a] cursor-pointer'}`}
                          onClick={() => !previewUrl && fileInputRef.current?.click()}
                          style={{ minHeight: '160px' }}
                        >
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleFileSelect}
                            />
                            
                            {previewUrl ? (
                                <div className="relative w-full h-full group">
                                    <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded" />
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                                      className="absolute top-2 right-2 bg-black/70 p-1 rounded-full text-white hover:bg-red-600 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 pointer-events-none">
                                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm text-gray-300 font-medium">Cliquez pour uploader</p>
                                    <p className="text-xs text-gray-500">JPG, PNG (Max 2MB)</p>
                                </div>
                            )}
                        </div>
                        {/* Fallback URL input */}
                        <div className="mt-2 flex items-center gap-2">
                           <span className="text-xs text-gray-500">OU via URL:</span>
                           <input 
                              className="flex-1 bg-transparent border-b border-gray-700 text-xs text-gray-400 focus:text-white focus:border-white outline-none py-1"
                              placeholder="https://..."
                              value={formData.thumbnail_url}
                              onChange={(e) => {
                                setFormData({...formData, thumbnail_url: e.target.value});
                                if(e.target.value) {
                                   setPreviewUrl(e.target.value);
                                   setThumbnailFile(null); // Clear file if URL provided
                                }
                              }}
                           />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Miniatures du dossier /public/thumbnails</label>
                        <div className="grid grid-cols-3 gap-3">
                          {LOCAL_THUMBNAILS.map((thumbnail) => {
                            const isSelected = formData.thumbnail_url === thumbnail.src;
                            return (
                              <button
                                key={thumbnail.id}
                                type="button"
                                onClick={() => handleSelectLocalThumbnail(thumbnail.src)}
                                className={`group border rounded-lg overflow-hidden text-left transition ${isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-gray-700 hover:border-gray-400'}`}
                              >
                                <div className="relative w-full h-20 bg-black/40">
                                  <img src={thumbnail.src} alt={thumbnail.label} className="w-full h-full object-cover" />
                                  {isSelected && (
                                    <span className="absolute top-2 right-2 text-[10px] uppercase bg-primary text-white px-2 py-0.5 rounded-full">
                                      Sélectionnée
                                    </span>
                                  )}
                                </div>
                                <div className="px-2 py-2 text-xs text-gray-300 group-hover:text-white">
                                  {thumbnail.label}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Ajoutez vos images dans <span className="font-mono">public/thumbnails</span> et mettez la liste à jour dans <span className="font-mono">constants.ts</span>.
                        </p>
                      </div>

                      <div className="h-px bg-gray-700 my-4"></div>

                      {/* SOURCE SELECTOR */}
                      <div>
                          <label className="block text-sm text-gray-400 mb-2">Source du contenu</label>
                          <div className="grid grid-cols-3 gap-2">
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, source_type: 'vidmoly'})}
                                className={`flex flex-col items-center justify-center gap-1 py-2 rounded border text-[10px] ${formData.source_type === 'vidmoly' ? 'border-purple-500 bg-purple-500/10 text-purple-500' : 'border-gray-700 bg-transparent text-gray-500'}`}
                              >
                                  <PlayCircle className="w-4 h-4" /> VidMoly
                              </button>
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, source_type: 'drive'})}
                                className={`flex flex-col items-center justify-center gap-1 py-2 rounded border text-[10px] ${formData.source_type === 'drive' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-gray-700 bg-transparent text-gray-500'}`}
                              >
                                  <Share2 className="w-4 h-4" /> Google Drive
                              </button>
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, source_type: 'r2'})}
                                className={`flex flex-col items-center justify-center gap-1 py-2 rounded border text-[10px] ${formData.source_type === 'r2' ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-gray-700 bg-transparent text-gray-500'}`}
                              >
                                  <HardDrive className="w-4 h-4" /> R2
                              </button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Titre</label>
                          <input required className="w-full bg-[#2f2f2f] rounded p-2 text-white outline-none focus:ring-1 focus:ring-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                      </div>
                      
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">
                              {formData.source_type === 'vidmoly' ? 'Slug VidMoly' : formData.source_type === 'drive' ? 'ID Google Drive' : 'Clé R2'}
                          </label>
                          <input required className="w-full bg-[#2f2f2f] rounded p-2 text-white outline-none focus:ring-1 focus:ring-primary font-mono text-sm" placeholder={formData.source_type === 'vidmoly' ? 'ID du lien embed' : ''} value={formData.video_key} onChange={e => setFormData({...formData, video_key: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Année</label>
                            <input type="number" className="w-full bg-[#2f2f2f] rounded p-2 text-white outline-none focus:ring-1 focus:ring-primary" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Durée (sec)</label>
                            <input type="number" className="w-full bg-[#2f2f2f] rounded p-2 text-white outline-none focus:ring-1 focus:ring-primary" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Description</label>
                          <textarea className="w-full bg-[#2f2f2f] rounded p-2 text-white outline-none focus:ring-1 focus:ring-primary h-20" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-6">
                          <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-300 hover:text-white">Annuler</button>
                          <button 
                            type="submit" 
                            disabled={uploadingImage}
                            className="px-6 py-2 bg-primary rounded font-bold hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {uploadingImage ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" /> Upload...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" /> {editingId ? 'Mettre à jour' : 'Enregistrer'}
                                </>
                              )}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
