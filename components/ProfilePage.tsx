import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';
import { SubscriptionPlan, UserProfile } from '../types'; 
import { CheckBadgeIcon, StarIcon, CreditCardIcon, TrashIcon, PlusIcon } from '../constants'; 

interface ProfilePageProps {
  user: User;
  onProfileUpdate: (fullName: string, officeName: string, logoUrl?: string | null) => Promise<boolean>; 
  setProfileError: (error: string | null) => void;
  profileError: string | null;
  setProfileSuccess: (message: string | null) => void;
  profileSuccess: string | null;
}

const getPlanDisplayName = (plan?: SubscriptionPlan): string => {
  if (!plan) return 'Plano Gratuito';
  switch (plan) {
    case SubscriptionPlan.PRO_LIFETIME:
      return 'Pro Vitalício';
    case SubscriptionPlan.PRO_MONTHLY:
      return 'Pro Mensal';
    case SubscriptionPlan.FREE:
    default:
      return 'Plano Gratuito';
  }
};

const LOGO_BUCKET = 'user-logos'; // Nome do bucket atualizado para usar hífen

const ProfilePage: React.FC<ProfilePageProps> = ({ 
    user, 
    onProfileUpdate, 
    profileError, 
    setProfileError,
    profileSuccess,
    setProfileSuccess
}) => {
  const [fullName, setFullName] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [currentPlanDisplay, setCurrentPlanDisplay] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      const userMeta = user.user_metadata as UserProfile;
      setFullName(userMeta?.full_name || '');
      setOfficeName(userMeta?.office_name || '');
      setCurrentLogoUrl(userMeta?.logo_url || null);
      setLogoPreviewUrl(userMeta?.logo_url || null); // Initialize preview with current logo
      setCurrentPlanDisplay(getPlanDisplayName(userMeta?.current_plan));
      setSelectedLogoFile(null); // Reset file selection
    }
  }, [user]);

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setProfileError("O arquivo da logo não deve exceder 2MB.");
        setSelectedLogoFile(null);
        setLogoPreviewUrl(currentLogoUrl); // Revert preview
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
        setProfileError("Formato de arquivo inválido. Use PNG, JPG, GIF ou WEBP.");
        setSelectedLogoFile(null);
        setLogoPreviewUrl(currentLogoUrl); // Revert preview
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
        return;
      }
      setProfileError(null);
      setSelectedLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedLogoFile(null);
      setLogoPreviewUrl(currentLogoUrl); // Revert to current if selection is cleared
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl || !user) {
      setProfileError("Nenhuma logo para remover ou usuário não encontrado.");
      return;
    }
    setIsLogoUploading(true); // Use same loading state for simplicity
    setProfileError(null);
    setProfileSuccess(null);

    // Extract file path from URL
    // Assumes URL is like: .../storage/v1/object/public/user-logos/user_id/logo.png
    try {
      const urlParts = new URL(currentLogoUrl);
      const pathSegments = urlParts.pathname.split('/');
      // Find the bucket name, then join everything after it.
      // The bucket name in the URL might still be the old one if this is an old logo.
      // We should use the constant LOGO_BUCKET for the operation, but parse path relative to it.
      const bucketNameInPath = pathSegments.find(segment => segment === 'user_logos' || segment === 'user-logos');
      if (!bucketNameInPath) {
          throw new Error("Não foi possível identificar o nome do bucket na URL da logo para extrair o caminho do arquivo.");
      }
      const bucketIndex = pathSegments.indexOf(bucketNameInPath);

      if (bucketIndex === -1 || bucketIndex + 1 >= pathSegments.length) {
          throw new Error("Não foi possível extrair o caminho do arquivo da URL da logo.");
      }
      const filePath = pathSegments.slice(bucketIndex + 1).join('/');


      const { error: deleteError } = await supabase.storage
        .from(LOGO_BUCKET) // Use the correct current bucket name for the delete operation
        .remove([filePath]);

      if (deleteError) {
        // Attempt to remove from old bucket name if it was 'user_logos' (underscore) and delete from 'user-logos' (hyphen) failed
        if (bucketNameInPath === 'user_logos') {
            console.warn(`Tentando remover do bucket antigo '${bucketNameInPath}' para o arquivo: ${filePath}`);
            const { error: oldDeleteError } = await supabase.storage.from(bucketNameInPath).remove([filePath]);
            if (oldDeleteError) {
                 // If both fail, throw the original error or a combined one
                 console.error(`Falha ao remover do bucket novo '${LOGO_BUCKET}' e também do antigo '${bucketNameInPath}'.`, deleteError, oldDeleteError);
                 throw deleteError; // Throw the error related to the attempt on LOGO_BUCKET
            }
             // If deletion from old bucket was successful, proceed.
        } else {
            throw deleteError;
        }
      }

      // Update profile to remove logo_url
      const success = await onProfileUpdate(fullName, officeName, null); // Pass null to indicate removal
      if (success) {
        setProfileSuccess('Logo removida com sucesso!');
        setCurrentLogoUrl(null);
        setLogoPreviewUrl(null);
        setSelectedLogoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
         setProfileError(profileError || 'Falha ao atualizar perfil após remover logo.');
      }
    } catch (error: any) {
      console.error("Erro ao remover logo:", error);
      setProfileError(`Erro ao remover logo: ${error.message || 'Erro desconhecido.'}`);
    } finally {
      setIsLogoUploading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    let newLogoUrl = currentLogoUrl; // Start with the existing logo URL

    if (selectedLogoFile && user) {
      setIsLogoUploading(true);
      const fileExtension = selectedLogoFile.name.split('.').pop();
      const filePath = `${user.id}/logo.${fileExtension}`;

      // If there's an old logo with a different extension, or from a differently named bucket in its URL
      if (currentLogoUrl && currentLogoUrl.includes(user.id)) {
        try {
            const oldUrlParts = new URL(currentLogoUrl);
            const oldPathSegments = oldUrlParts.pathname.split('/');
            const oldBucketIndex = oldPathSegments.findIndex(segment => segment === 'user_logos' || segment === 'user-logos');

            if (oldBucketIndex !== -1 && oldBucketIndex + 1 < oldPathSegments.length) {
                const oldBucketNameInUrl = oldPathSegments[oldBucketIndex];
                const oldFileNameWithPath = oldPathSegments.slice(oldBucketIndex + 1).join('/');
                
                // If the bucket name in the old URL is different from current LOGO_BUCKET,
                // or if file extension is different, try to remove the old one.
                if (oldBucketNameInUrl !== LOGO_BUCKET || !oldFileNameWithPath.endsWith(`.${fileExtension}`)) {
                    console.log(`Tentando remover logo antiga de: ${oldBucketNameInUrl}/${oldFileNameWithPath}`);
                    await supabase.storage.from(oldBucketNameInUrl).remove([oldFileNameWithPath]);
                }
            }
        } catch(removeError) {
            console.warn("Não foi possível remover a logo antiga. Prosseguindo com o upload:", removeError);
        }
      }


      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filePath, selectedLogoFile, {
          cacheControl: '3600',
          upsert: true, // Replace if exists (important for same path, different file)
        });

      if (uploadError) {
        setProfileError(`Erro no upload da logo: ${uploadError.message}`);
        setIsLoading(false);
        setIsLogoUploading(false);
        return;
      }

      if (uploadData) {
        const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(uploadData.path);
        newLogoUrl = urlData.publicUrl;
      }
      setIsLogoUploading(false);
    }

    const success = await onProfileUpdate(fullName.trim(), officeName.trim(), newLogoUrl);
    
    setIsLoading(false);
    if (success) {
      setProfileSuccess('Perfil atualizado com sucesso!');
      setCurrentLogoUrl(newLogoUrl); // Update currentLogoUrl state
      setSelectedLogoFile(null); // Clear selected file
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      if(!profileError) { 
         setProfileError('Falha ao atualizar o perfil. Tente novamente.');
      }
    }
  };

  const PlanDisplayIcon = () => {
    const plan = (user.user_metadata as UserProfile)?.current_plan;
    if (plan === SubscriptionPlan.PRO_LIFETIME) {
      return <StarIcon className="w-5 h-5 text-yellow-500 mr-2" />;
    }
    if (plan === SubscriptionPlan.PRO_MONTHLY) {
      return <CreditCardIcon className="w-5 h-5 text-blue-500 mr-2" />;
    }
    return <CheckBadgeIcon className="w-5 h-5 text-green-500 mr-2" />;
  };

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-semibold text-slate-800 mb-3 sm:mb-0">
          Meu Perfil
        </h2>
      </div>

      {profileError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm" role="alert">
          {profileError}
        </div>
      )}
      {profileSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md text-sm" role="alert">
          {profileSuccess}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="emailProfile" className="block text-sm font-medium text-slate-700 mb-1">
            E-mail (não editável)
          </label>
          <input
            type="email"
            id="emailProfile"
            value={user.email || ''}
            readOnly
            className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="currentPlanProfile" className="block text-sm font-medium text-slate-700 mb-1">
            Plano Atual
          </label>
          <div className="mt-1 flex items-center px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm sm:text-sm">
            <PlanDisplayIcon />
            <span className="font-medium">{currentPlanDisplay}</span>
          </div>
        </div>


        <div>
          <label htmlFor="fullNameProfile" className="block text-sm font-medium text-slate-700 mb-1">
            Nome Completo (para recibos)
          </label>
          <input
            type="text"
            id="fullNameProfile"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Seu nome como aparecerá nos recibos"
            required
            disabled={isLoading || isLogoUploading}
          />
        </div>

        <div>
          <label htmlFor="officeNameProfile" className="block text-sm font-medium text-slate-700 mb-1">
            Nome do Escritório/Empresa (para rodapé do recibo)
          </label>
          <input
            type="text"
            id="officeNameProfile"
            value={officeName}
            onChange={(e) => setOfficeName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Ex: Advocacia Silva, Consultoria XYZ"
            disabled={isLoading || isLogoUploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Logo para Recibos (Opcional, máx 2MB, PNG/JPG/WEBP)
          </label>
          <div className="mt-2 flex items-center space-x-4">
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Preview da Logo" className="h-20 w-auto max-h-20 max-w-[150px] object-contain border border-slate-300 rounded-md p-1" />
            ) : (
              <div className="h-20 w-32 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center">
                <span className="text-xs text-slate-400">Sem logo</span>
              </div>
            )}
            <div className="flex flex-col space-y-2">
                 <input
                    type="file"
                    id="logoUpload"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleLogoFileChange}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 disabled:opacity-50"
                    ref={fileInputRef}
                    disabled={isLoading || isLogoUploading}
                  />
                  {currentLogoUrl && (
                    <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 rounded-md shadow-sm disabled:opacity-50"
                        disabled={isLoading || isLogoUploading}
                    >
                        <TrashIcon className="w-4 h-4 mr-1.5" />
                        Remover Logo Atual
                    </button>
                  )}
            </div>
          </div>
          {isLogoUploading && <p className="text-sm text-blue-600 mt-2">Processando logo...</p>}
        </div>


        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-400"
            disabled={isLoading || isLogoUploading}
          >
            {(isLoading || isLogoUploading) ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
