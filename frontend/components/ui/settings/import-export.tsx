// "use client";

// import { useState } from "react";
// import { useUser } from "@clerk/nextjs";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Switch } from "@/components/ui/switch";
// import { Download, Upload, AlertCircle, CheckCircle, FileText } from "lucide-react";
// import { settingsApi, SettingsExportData, SettingsImportRequest } from "@/lib/api/settings";

// export default function ImportExport() {
//   const { user: clerkUser } = useUser();
//   const [isExporting, setIsExporting] = useState(false);
//   const [isImporting, setIsImporting] = useState(false);
//   const [importFile, setImportFile] = useState<File | null>(null);
//   const [importData, setImportData] = useState<SettingsExportData | null>(null);
//   const [overwriteExisting, setOverwriteExisting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   const handleExport = async () => {
//     if (!clerkUser?.id) {
//       setError("Not authenticated");
//       return;
//     }

//     setIsExporting(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const exportData = await settingsApi.exportSettings(clerkUser.id);

//       // Create and download JSON file
//       const blob = new Blob([JSON.stringify(exportData, null, 2)], {
//         type: 'application/json',
//       });

//       const url = URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = `conductor-settings-${exportData.marketCenter.name}-${new Date().toISOString().split('T')[0]}.json`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);

//       setSuccess('Settings exported successfully!');
//     } catch (err) {
//       console.error('Export error:', err);
//       setError(err instanceof Error ? err.message : 'Failed to export settings');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     setImportFile(file);
//     setError(null);
//     setSuccess(null);

//     try {
//       const text = await file.text();
//       const data = JSON.parse(text);

//       // Basic validation
//       if (!data.marketCenter || !data.settings || !data.version) {
//         throw new Error('Invalid settings file format');
//       }

//       setImportData(data);
//     } catch (err) {
//       console.error('File parse error:', err);
//       setError(err instanceof Error ? err.message : 'Failed to parse settings file');
//       setImportFile(null);
//       setImportData(null);
//     }
//   };

//   const handleImport = async () => {
//     if (!importData) return;

//     if (!clerkUser?.id) {
//       setError("Not authenticated");
//       return;
//     }

//     setIsImporting(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const request: SettingsImportRequest = {
//         data: importData,
//         overwriteExisting
//       };

//       const result = await settingsApi.importSettings(clerkUser.id, request);

//       setSuccess(result.message);
//       setImportFile(null);
//       setImportData(null);

//       // Clear file input
//       const fileInput = document.getElementById('import-file') as HTMLInputElement;
//       if (fileInput) fileInput.value = '';

//     } catch (err) {
//       console.error('Import error:', err);
//       setError(err instanceof Error ? err.message : 'Failed to import settings');
//     } finally {
//       setIsImporting(false);
//     }
//   };

//   const clearMessages = () => {
//     setError(null);
//     setSuccess(null);
//   };

//   return (
//     <div className="space-y-6">
//       {/* Export Settings */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Download className="h-5 w-5" />
//             Export Settings
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <p className="text-sm text-muted-foreground">
//             Export all your market center settings to a JSON file for backup or transfer purposes.
//           </p>

//           <Button
//             onClick={handleExport}
//             disabled={isExporting}
//             className="w-full sm:w-auto"
//           >
//             <Download className="mr-2 h-4 w-4" />
//             {isExporting ? 'Exporting...' : 'Export Settings'}
//           </Button>
//         </CardContent>
//       </Card>

//       {/* Import Settings */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Upload className="h-5 w-5" />
//             Import Settings
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <p className="text-sm text-muted-foreground">
//             Import settings from a previously exported JSON file. You can choose to merge with existing settings or overwrite them completely.
//           </p>

//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="import-file">Select Settings File</Label>
//               <Input
//                 id="import-file"
//                 type="file"
//                 accept=".json"
//                 onChange={handleFileSelect}
//                 className="mt-1"
//               />
//             </div>

//             {importData && (
//               <div className="space-y-4">
//                 {/* File Info */}
//                 <Card className="border-dashed">
//                   <CardContent className="pt-4">
//                     <div className="flex items-center gap-3">
//                       <FileText className="h-8 w-8 text-muted-foreground" />
//                       <div>
//                         <p className="font-medium">{importData.marketCenter.name}</p>
//                         <p className="text-sm text-muted-foreground">
//                           Exported: {new Date(importData.exportedAt).toLocaleDateString()}
//                         </p>
//                         <p className="text-sm text-muted-foreground">
//                           Version: {importData.version}
//                         </p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>

//                 {/* Import Options */}
//                 <div className="flex items-center space-x-2">
//                   <Switch
//                     id="overwrite-mode"
//                     checked={overwriteExisting}
//                     onCheckedChange={setOverwriteExisting}
//                   />
//                   <Label htmlFor="overwrite-mode" className="text-sm">
//                     Overwrite existing settings (instead of merging)
//                   </Label>
//                 </div>

//                 <p className="text-xs text-muted-foreground">
//                   {overwriteExisting
//                     ? "⚠️ This will completely replace your current settings"
//                     : "Settings will be merged with your current configuration"
//                   }
//                 </p>

//                 {/* Import Confirmation */}
//                 <AlertDialog>
//                   <AlertDialogTrigger asChild>
//                     <Button
//                       className="w-full sm:w-auto"
//                       disabled={isImporting}
//                     >
//                       <Upload className="mr-2 h-4 w-4" />
//                       {isImporting ? 'Importing...' : 'Import Settings'}
//                     </Button>
//                   </AlertDialogTrigger>
//                   <AlertDialogContent>
//                     <AlertDialogHeader>
//                       <AlertDialogTitle>Confirm Settings Import</AlertDialogTitle>
//                       <AlertDialogDescription>
//                         Are you sure you want to import these settings from &quot;{importData.marketCenter.name}&quot;?
//                         {overwriteExisting
//                           ? " This will overwrite all your current settings."
//                           : " This will merge with your current settings."
//                         }
//                       </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                       <AlertDialogCancel onClick={clearMessages}>Cancel</AlertDialogCancel>
//                       <AlertDialogAction onClick={handleImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
//                         {overwriteExisting ? 'Overwrite Settings' : 'Import Settings'}
//                       </AlertDialogAction>
//                     </AlertDialogFooter>
//                   </AlertDialogContent>
//                 </AlertDialog>
//               </div>
//             )}
//           </div>
//         </CardContent>
//       </Card>

//       {/* Messages */}
//       {error && (
//         <Alert variant="destructive">
//           <AlertCircle className="h-4 w-4" />
//           <AlertDescription>{error}</AlertDescription>
//         </Alert>
//       )}

//       {success && (
//         <Alert className="border-green-200 bg-green-50">
//           <CheckCircle className="h-4 w-4 text-green-600" />
//           <AlertDescription className="text-green-800">{success}</AlertDescription>
//         </Alert>
//       )}
//     </div>
//   );
// }
