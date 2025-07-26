import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Star, Play, Calendar, Clock } from 'lucide-react';
import { useIncrementMovieViews, useIncrementEpisodeViews, useIncrementShowEpisodeViews } from '@/hooks/useViewTracking';
import AutoClickAd from '@/components/AutoClickAd';

const Player = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const episodeId = searchParams.get('episode');
  const content = location.state || {};
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [currentSeasonDetails, setCurrentSeasonDetails] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const incrementMovieViews = useIncrementMovieViews();
  const incrementEpisodeViews = useIncrementEpisodeViews();
  const incrementShowEpisodeViews = useIncrementShowEpisodeViews();

  // Comprehensive debugging
  console.log('=== PLAYER DEBUG INFO ===');
  console.log('Location state:', location.state);
  console.log('Content object:', content);
  console.log('Episode ID from URL:', episodeId);
  console.log('Content.content_type:', content?.content_type);
  console.log('Has valid content:', !!(content && (content.content_type || episodeId)));
  console.log('========================');

  // Fetch episode details if episodeId is provided
  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      if (episodeId) {
        setIsVideoLoading(true);
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: episodeData, error } = await supabase
            .from('episode')
            .select('*')
            .eq('episode_id', episodeId)
            .single();

          if (!error && episodeData) {
            setCurrentEpisode(episodeData);
          }
        } catch (err) {
          console.error('Error fetching episode details:', err);
        } finally {
          setIsVideoLoading(false);
        }
      } else {
        setIsVideoLoading(false);
      }
    };

    fetchEpisodeDetails();
    // Reset video error when episode changes
    setVideoError(false);
  }, [episodeId]);

  // Get season details for web series
  useEffect(() => {
    const fetchSeasonDetails = async () => {
      if (content.content_type === 'Web Series' && content.web_series?.season_id_list) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const seasonId = content.web_series.season_id_list[0]; // Default to first season

          if (seasonId) {
            const { data: seasonData, error } = await supabase
              .from('season')
              .select('*')
              .eq('season_id', seasonId)
              .single();

            if (!error && seasonData) {
              setCurrentSeasonDetails(seasonData);
            }
          }
        } catch (err) {
          console.error('Error fetching season details:', err);
        }
      }
    };

    fetchSeasonDetails();
  }, [content]);

  // Get the actual video URL based on content type
  const getVideoUrl = () => {
    console.log('Getting video URL for content:', content);
    console.log('Content type:', content.content_type);
    console.log('Current episode:', currentEpisode);
    console.log('Episode ID from URL:', episodeId);

    // Priority 1: If we have a current episode (from episodeId), use its video URL
    if (currentEpisode?.video_url) {
      console.log('Current episode video URL found:', currentEpisode.video_url);
      return currentEpisode.video_url;
    }

    // Priority 2: Handle different content types
    if (content.content_type === 'Movie' && content.movie?.video_url) {
      console.log('Movie video URL found:', content.movie.video_url);
      return content.movie.video_url;
    } 

    if (content.content_type === 'Web Series') {
      // For web series, prefer episode from seasons data if no specific episode loaded
      if (content.web_series?.seasons?.[0]?.episodes?.[0]?.video_url) {
        console.log('Web Series first episode video URL found:', content.web_series.seasons[0].episodes[0].video_url);
        return content.web_series.seasons[0].episodes[0].video_url;
      }
    }

    if (content.content_type === 'Show') {
      // For shows, check if we have episode data or fallback to content video URL
      if (content.show?.episode_id_list?.length > 0) {
        const showVideoUrl = content.videoUrl || content.video_url;
        console.log('Show video URL found:', showVideoUrl);
        return showVideoUrl;
      }
    }

    // Priority 3: Fallback to any video URL in the content object
    const fallbackUrl = content.videoUrl || content.video_url || content.movie?.video_url;
    console.log('Using fallback video URL:', fallbackUrl);
    return fallbackUrl || '';
  };

  const videoUrl = getVideoUrl();

  console.log('Final video URL for player:', videoUrl, 'for content type:', content.content_type);

  // Convert video page URLs to direct video URLs or embed URLs
  const getVideoUrlForPlayer = (url) => {
    console.log('Converting URL for player:', url);

    // Bitchute - use embed URL since direct video URLs aren't publicly accessible
    if (url.includes('bitchute.com/video/')) {
      const videoId = url.split('/video/')[1].split('?')[0]; // Remove any existing query params
      return `https://www.bitchute.com/embed/${videoId}?autoplay=0&hide_share=1&hide_sidebar=1&hide_related=1&disable_download=1`;
    }

    // Odysee
    if (url.includes('odysee.com/')) {
      // Handle various Odysee URL formats
      let videoPath = '';
      if (url.includes('odysee.com/@')) {
        // Format: https://odysee.com/@channel/video-title
        const parts = url.split('odysee.com/')[1];
        videoPath = parts;
      } else if (url.includes('lbry.tv/')) {
        // Legacy LBRY format
        const parts = url.split('lbry.tv/')[1];
        videoPath = parts;
      }
      if (videoPath) {
        return `https://odysee.com/$/embed/${videoPath}`;
      }
    }

    // YouTube
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
    }

    // Vimeo
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1];
      return `https://player.vimeo.com/video/${videoId}?autoplay=0`;
    }

    // Dailymotion
    if (url.includes('dailymotion.com/video/')) {
      const videoId = url.split('/video/')[1];
      return `https://www.dailymotion.com/embed/video/${videoId}?autoplay=0`;
    }

    // Return original URL if no conversion needed
    return url;
  };

  

  // Auto-reload logic specifically for Bitchute and other iframe videos
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    const setupAutoRefresh = () => {
      // Get estimated duration for auto-refresh
      let estimatedDuration = 15 * 60 * 1000; // Default 15 minutes
      
      if (currentEpisode?.duration) {
        estimatedDuration = currentEpisode.duration * 60 * 1000; // Convert to milliseconds
      } else if (content.content_type === 'Movie' && content.movie?.duration) {
        estimatedDuration = content.movie.duration * 60 * 1000; // Convert to milliseconds
      }

      // Add 30 seconds buffer and cap at reasonable limits
      estimatedDuration = Math.min(Math.max(estimatedDuration + 30000, 5 * 60 * 1000), 45 * 60 * 1000);
      
      // For Bitchute, use a shorter refresh time since we can't detect video end reliably
      if (videoUrl && videoUrl.includes('bitchute.com')) {
        // Use the estimated duration or default to 10 minutes for Bitchute
        estimatedDuration = Math.min(estimatedDuration, 10 * 60 * 1000);
        console.log(`Setting Bitchute auto-refresh for ${estimatedDuration/1000/60} minutes`);
      } else {
        console.log(`Setting general auto-refresh for ${estimatedDuration/1000/60} minutes`);
      }
      
      refreshTimer = setTimeout(() => {
        console.log('Auto-refreshing page after video duration');
        window.location.reload();
      }, estimatedDuration);
    };
    
    // Set up auto-refresh if we have video content
    if (videoUrl && !videoError) {
      setupAutoRefresh();
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [videoUrl, videoError, currentEpisode, content]);

  // Handle video restart for regular video elements
  const handleVideoRestart = (videoElement) => {
    if (videoElement) {
      videoElement.currentTime = 0;
      videoElement.play().catch((error) => {
        console.warn('Video restart failed:', error);
      });
    }
  };

  // View tracking logic - only count one view per session after 30 seconds
  useEffect(() => {
    let viewTimer: NodeJS.Timeout;
    
    // Create a unique session key for this content/episode combination
    const sessionKey = episodeId ? `episode_${episodeId}` : `content_${id}`;
    const hasTrackedKey = `view_tracked_${sessionKey}`;
    
    // Check if we've already tracked a view for this session
    const hasTrackedView = sessionStorage.getItem(hasTrackedKey) === 'true';

    const trackView = async () => {
      if (!hasTrackedView && content && (id || episodeId)) {
        try {
          console.log('=== STARTING VIEW TRACKING ===');
          console.log('Content:', content);
          console.log('Episode ID:', episodeId);
          console.log('Content ID:', id);
          console.log('Content Type:', content.content_type);
          
          const contentType = content.content_type?.toLowerCase() || content.type?.toLowerCase();

          let trackingPromise = null;

          if (contentType === 'movie' && id) {
            console.log('Tracking movie view for content_id:', id);
            trackingPromise = incrementMovieViews.mutateAsync(id);
          } else if (episodeId) {
            // For episodes, always increment the specific episode
            console.log('Tracking episode view for episode_id:', episodeId);
            trackingPromise = incrementEpisodeViews.mutateAsync(episodeId);
          } else if (contentType === 'show' && content.show?.episode_id_list?.[0]) {
            // If no specific episode ID but show has episodes, track first episode
            const firstEpisodeId = content.show.episode_id_list[0];
            console.log('Tracking show episode view for first episode:', firstEpisodeId);
            trackingPromise = incrementShowEpisodeViews.mutateAsync(firstEpisodeId);
          } else if (contentType === 'web series' && content.web_series?.seasons?.[0]?.episodes?.[0]) {
            // If no specific episode ID but web series has episodes, track first episode
            const firstEpisode = content.web_series.seasons[0].episodes[0];
            if (firstEpisode.episode_id) {
              console.log('Tracking web series episode view for first episode:', firstEpisode.episode_id);
              trackingPromise = incrementEpisodeViews.mutateAsync(firstEpisode.episode_id);
            }
          }

          if (trackingPromise) {
            await trackingPromise;
            console.log('View tracking API call completed successfully');
            // Mark this view as tracked in session storage only after successful API call
            sessionStorage.setItem(hasTrackedKey, 'true');
            console.log('View tracked and marked in session storage:', sessionKey);
          } else {
            console.warn('No valid tracking method found for content type:', contentType);
          }
        } catch (error) {
          console.error('Error tracking view:', error);
          console.error('Error details:', error.message);
          // Don't mark as tracked on error - allow retry on next page load
        }
      } else {
        console.log('Skipping view tracking - already tracked or missing data:', {
          hasTracked: hasTrackedView,
          hasContent: !!content,
          hasId: !!(id || episodeId)
        });
      }
    };

    // Only start tracking if we have valid content and video URL, and we haven't already tracked
    if (content && videoUrl && !videoError && !hasTrackedView && (id || episodeId)) {
      console.log('Starting view tracking timer for:', content.content_type || content.type, 'with session key:', sessionKey);
      viewTimer = setTimeout(() => {
        trackView();
      }, 30000); // Reduced to 30 seconds for faster tracking
    } else {
      console.log('Not starting view tracking:', {
        hasContent: !!content,
        hasVideoUrl: !!videoUrl,
        hasVideoError: videoError,
        hasTrackedView,
        hasValidId: !!(id || episodeId)
      });
    }

    return () => {
      if (viewTimer) {
        clearTimeout(viewTimer);
      }
    };
  }, [content, currentEpisode, id, incrementMovieViews, incrementEpisodeViews, incrementShowEpisodeViews, episodeId, videoUrl, videoError]);

  const getContentTypeDisplay = () => {
    switch (content.content_type) {
      case 'Movie': return 'Movie';
      case 'Web Series': return 'Web Series';
      case 'Show': return 'TV Show';
      default: 
        // Fallback for legacy data
        if (content.type === 'series') return 'Web Series';
        if (content.type === 'show') return 'TV Show';
        return content.content_type || content.type || 'Content';
    }
  };

  // Get episode number for web series and shows
  const getEpisodeInfo = () => {
    if (currentEpisode) {
      // Try to extract episode number from title or use a default
      const episodeMatch = currentEpisode.title?.match(/episode\s*(\d+)/i);
      if (episodeMatch) {
        return `Episode ${episodeMatch[1]}`;
      }
      // Fallback: use episode order if available
      return `Episode ${currentEpisode.episode_number || '1'}`;
    }
    return null;
  };

  // Get season number for web series
  const getSeasonInfo = () => {
    if (content.content_type === 'Web Series') {
      if (currentSeasonDetails?.season_number) {
        return `Season ${currentSeasonDetails.season_number}`;
      } else if (content.seasonNumber) {
        return `Season ${content.seasonNumber}`;
      }
      return 'Season 1'; // Default fallback
    }
    return null;
  };

  // Get duration - prioritize episode duration
  const getDuration = () => {
    if (currentEpisode?.duration) {
      return `${currentEpisode.duration} min`;
    }
    if (content.content_type === 'Movie' && content.movie?.duration) {
      return `${content.movie.duration} min`;
    }
    return null;
  };

  // Get description - prioritize episode description
  const getDescription = () => {
    if (currentEpisode?.description) {
      return currentEpisode.description;
    }
    if (content.content_type === 'Movie' && content.movie?.description) {
      return content.movie.description;
    } else if (content.content_type === 'Web Series' && currentSeasonDetails?.season_description) {
      return currentSeasonDetails.season_description;
    } else if (content.content_type === 'Show' && content.show?.description) {
      return content.show.description;
    }
    return content.description || 'No description available';
  };

  // Get rating information
  const getRatingInfo = () => {
    if (content.content_type === 'Movie' && content.movie) {
      return {
        rating_type: content.movie.rating_type,
        rating: content.movie.rating,
        release_year: content.movie.release_year
      };
    } else if (content.content_type === 'Web Series' && currentSeasonDetails) {
      return {
        rating_type: currentSeasonDetails.rating_type,
        rating: currentSeasonDetails.rating,
        release_year: currentSeasonDetails.release_year
      };
    } else if (content.content_type === 'Show' && content.show) {
      return {
        rating_type: content.show.rating_type,
        rating: content.show.rating,
        release_year: content.show.release_year
      };
    }
    return {
      rating_type: content.rating_type || content.rating || 'Not Rated',
      rating: content.score || content.rating || 0,
      release_year: content.year || content.release_year || new Date().getFullYear()
    };
  };

  const ratingInfo = getRatingInfo();

  const handlePlay = () => {
    // View tracking is now handled by the 45-second timer
    console.log('Video started playing');
  };

  // Safety check - only redirect if we truly have no way to load content
  React.useEffect(() => {
    // Give some time for content to load, then check if we have valid data
    const timeoutId = setTimeout(() => {
      // Only redirect if we have absolutely no content data AND no way to fetch it
      const hasValidContent = content && (content.content_type || content.type);
      const hasValidIds = id || episodeId;
      
      console.log('Safety check - hasValidContent:', hasValidContent, 'hasValidIds:', hasValidIds);
      console.log('Content object exists:', !!content);
      console.log('Content type:', content?.content_type || content?.type);
      
      if (!hasValidContent && !hasValidIds) {
        console.warn('No valid content data available and no way to fetch content, redirecting to home');
        navigate('/', { replace: true });
      } else {
        console.log('Safety check passed - valid content found');
      }
    }, 3000); // Wait 3 seconds for content to load

    return () => clearTimeout(timeoutId);
  }, [content, navigate, episodeId, id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="sm"
              className="bg-primary/5 backdrop-blur-sm border border-primary/30 text-primary hover:bg-gradient-to-br hover:from-black/30 hover:via-[#0A7D4B]/5 hover:to-black/30 hover:border-primary/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Main Content Layout */}
          <div className="space-y-8">
            {/* Video Player Section */}
            <Card className="bg-gradient-to-br from-black/90 via-[#0A7D4B]/20 to-black/90 backdrop-blur-sm border border-border/50 wave-transition relative overflow-hidden">
              {/* Animated Background Waves */}
              <div className="absolute inset-0">
                <div className="player-wave-bg-1"></div>
                <div className="player-wave-bg-2"></div>
                <div className="player-wave-bg-3"></div>
              </div>

              <CardContent className="p-8 relative z-10">
                {/* Video Player */}
                <div className="w-full max-w-4xl mx-auto mb-8">
                  <div className="aspect-video bg-gradient-to-br from-black/95 via-[#0A7D4B]/10 to-black/95 rounded-xl relative border border-primary/20 shadow-2xl overflow-hidden custom-video-container">
                    {isVideoLoading ? (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-black/95 via-[#0A7D4B]/10 to-black/95 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 animate-pulse">
                            <Play className="w-8 h-8 text-primary fill-current animate-spin" />
                          </div>
                          <div className="text-primary text-xl font-semibold mb-2 animate-pulse">
                            Loading Content...
                          </div>
                          <p className="text-muted-foreground text-sm">
                            Please wait while we prepare your video
                          </p>
                        </div>
                      </div>
                    ) : videoUrl && !videoError ? (
                      <div className="relative w-full h-full">
                        {/* Check if URL needs iframe (platforms that require embedded players) */}
                        {videoUrl.includes('bitchute.com') || videoUrl.includes('odysee.com') || videoUrl.includes('lbry.tv') || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com') || videoUrl.includes('dailymotion.com') ? (
                          <iframe
                            className="w-full h-full rounded-xl"
                            src={getVideoUrlForPlayer(videoUrl)}
                            title="Video Player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            onLoad={() => setIsVideoLoading(false)}
                            onError={() => {
                              setVideoError(true);
                              setIsVideoLoading(false);
                            }}
                            style={{
                              filter: 'contrast(1.1) brightness(1.05)',
                              outline: 'none',
                              transition: 'opacity 0.3s ease'
                            }}
                          />
                        ) : (
                          <video
                            className="w-full h-full rounded-xl object-cover custom-video-player"
                            controls
                            poster={content.image || content.thumbnail_url || content.movie?.thumbnail_url}
                            preload="metadata"
                            autoPlay={false}
                            onLoadStart={() => setIsVideoLoading(true)}
                            onCanPlay={() => setIsVideoLoading(false)}
                            onError={() => {
                              setVideoError(true);
                              setIsVideoLoading(false);
                            }}
                            onEnded={() => {
                              console.log('HTML5 video ended, reloading page in 2 seconds');
                              setTimeout(() => {
                                window.location.reload();
                              }, 2000);
                            }}
                            onPlay={handlePlay}
                            style={{
                              filter: 'contrast(1.1) brightness(1.05)',
                              outline: 'none',
                              transition: 'opacity 0.3s ease'
                            }}
                          >
                            <source src={getVideoUrlForPlayer(videoUrl)} type="video/mp4" />
                            <source src={getVideoUrlForPlayer(videoUrl)} type="video/webm" />
                            <source src={getVideoUrlForPlayer(videoUrl)} type="video/ogg" />
                            Your browser does not support the video tag.
                          </video>
                        )}

                        {/* Subtle theme-integrated borders */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 pointer-events-none"></div>
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-black/95 via-[#0A7D4B]/10 to-black/95 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                            <Play className="w-8 h-8 text-primary fill-current" />
                          </div>
                          <div className="text-primary text-xl font-semibold mb-2">
                            {videoError ? "Unable to Play Content" : "⚠️ Video Not Available"}
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {videoError ? "The video could not be loaded or played" : "No video URL found for this content"}
                          </p>
                          {!videoError && (
                            <p className="text-xs text-muted-foreground/70 mt-2">
                              Content Type: {getContentTypeDisplay()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Information */}
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* Title and Season/Episode Info */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-3xl font-bold text-foreground">
                      {content.content_type === 'Web Series' ? content.title : 
                       content.content_type === 'Show' ? content.show?.title || content.title :
                       currentEpisode?.title || content.title}
                    </h1>
                    <div className="flex items-center space-x-3">
                      {content.content_type === 'Web Series' && getSeasonInfo() && (
                        <span className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 px-3 py-1 rounded-md border border-blue-500/30 text-sm font-medium">
                          {getSeasonInfo()}
                        </span>
                      )}
                      {(content.content_type === 'Web Series' || content.content_type === 'Show') && getEpisodeInfo() && (
                        <span className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-300 px-3 py-1 rounded-md border border-purple-500/30 text-sm font-medium">
                          {getEpisodeInfo()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating and Year Info */}
                  <div className="flex items-center space-x-4 flex-wrap">
                    {ratingInfo.rating_type && (
                      <span className="bg-primary/20 text-primary px-3 py-1 rounded-md border border-primary/30 text-sm font-medium">
                        {ratingInfo.rating_type}
                      </span>
                    )}
                    {ratingInfo.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-foreground text-sm font-medium">
                          {ratingInfo.rating}
                        </span>
                      </div>
                    )}
                    {ratingInfo.release_year && (
                      <span className="text-muted-foreground text-sm font-medium">
                        {ratingInfo.release_year}
                      </span>
                    )}
                    {getDuration() && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground text-sm font-medium">
                          {getDuration()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Description</h3>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      {getDescription()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advertisement Section */}
            <AutoClickAd className="w-full" minHeight="200px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;