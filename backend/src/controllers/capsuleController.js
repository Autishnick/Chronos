import { getAuthenticatedSupabase } from '../config/supabase.js';

export const getCapsules = async (req, res) => {
  try {
    const supabase = getAuthenticatedSupabase(req);
    const { data, error } = await supabase
      .from('capsules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCapsuleById = async (req, res) => {
  try {
    const supabase = getAuthenticatedSupabase(req);
    const { data, error } = await supabase
      .from('capsules')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCapsule = async (req, res) => {
  try {
    const { capsuleId, contentUrl, locationText, unlockDate } = req.body;
    
    const supabase = getAuthenticatedSupabase(req);
    
    // Link user from the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('capsules')
      .insert({
        id: capsuleId,
        user_id: user.id,
        content_url: contentUrl,
        location_text: locationText, // Stored as stringified JSON metadata
        unlock_date: unlockDate,
        status: 'locked',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCapsule = async (req, res) => {
  try {
    const supabase = getAuthenticatedSupabase(req);
    const { error } = await supabase
      .from('capsules')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
