#requires -Version 7.0
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
if (-not ('GameHarness.JevKeyStore' -as [type])) {
    $jevCompilerReferences = @(Get-ChildItem -LiteralPath (Join-Path $PSHOME 'ref') -Filter '*.dll' | Select-Object -ExpandProperty FullName)
    $jevCompilerReferences += [Security.Cryptography.ProtectedData].Assembly.Location
    Add-Type -ReferencedAssemblies $jevCompilerReferences -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Security;
using System.Security.Cryptography;
using System.Runtime.InteropServices;
namespace GameHarness {
    public static class JevKeyStore {
        private static byte[] Entropy(string root) {
            string normalized = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar).ToUpperInvariant();
            using (SHA256 hash = SHA256.Create()) { return hash.ComputeHash(Encoding.UTF8.GetBytes("typesafe-jev:" + normalized)); }
        }
        public static string Target(string root) { return BitConverter.ToString(Entropy(root)).Replace("-", ""); }
        private static string KeyPath(string root) {
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "GameHarness", "Keys", "typesafe-jev-" + Target(root) + ".dpapi");
        }
        private static void Validate(char[] chars) {
            if (chars.Length == 0 || chars.Length > 2560) throw new InvalidOperationException("invalid_api_key");
            foreach (char value in chars) {
                if (Char.IsWhiteSpace(value) || Char.IsControl(value)) throw new InvalidOperationException("invalid_api_key");
            }
        }
        public static bool Exists(string root) { return File.Exists(KeyPath(root)); }
        public static void Save(string root, SecureString key) {
            if (key == null || key.Length == 0 || key.Length > 2560) throw new InvalidOperationException("invalid_api_key");
            IntPtr secret = Marshal.SecureStringToGlobalAllocUnicode(key);
            byte[] plaintext = null, ciphertext = null;
            char[] chars = null;
            string temporary = null;
            try {
                plaintext = new byte[key.Length * 2];
                Marshal.Copy(secret, plaintext, 0, plaintext.Length);
                chars = Encoding.Unicode.GetChars(plaintext);
                Validate(chars);
                ciphertext = ProtectedData.Protect(plaintext, Entropy(root), DataProtectionScope.CurrentUser);
                string path = KeyPath(root);
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
                using (FileStream stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None)) {
                    stream.Write(ciphertext, 0, ciphertext.Length);
                    stream.Flush(true);
                }
                File.Move(temporary, path, true);
                temporary = null;
            } finally {
                if (plaintext != null) Array.Clear(plaintext, 0, plaintext.Length);
                if (chars != null) Array.Clear(chars, 0, chars.Length);
                if (ciphertext != null) Array.Clear(ciphertext, 0, ciphertext.Length);
                Marshal.ZeroFreeGlobalAllocUnicode(secret);
                if (temporary != null && File.Exists(temporary)) File.Delete(temporary);
            }
        }
        public static void WriteToPipe(string root, Stream pipe) {
            string path = KeyPath(root);
            if (!File.Exists(path)) throw new InvalidOperationException("missing_api_key");
            if (new FileInfo(path).Length > 65536) throw new InvalidOperationException("invalid_key_blob");
            byte[] ciphertext = null, plaintext = null, utf8 = null;
            char[] chars = null;
            try {
                ciphertext = File.ReadAllBytes(path);
                if (ciphertext.Length > 65536) throw new InvalidOperationException("invalid_key_blob");
                plaintext = ProtectedData.Unprotect(ciphertext, Entropy(root), DataProtectionScope.CurrentUser);
                chars = Encoding.Unicode.GetChars(plaintext);
                Validate(chars);
                utf8 = new UTF8Encoding(false, true).GetBytes(chars);
                if (utf8.Length > 4096) throw new InvalidOperationException("invalid_api_key");
                pipe.Write(utf8, 0, utf8.Length);
                pipe.WriteByte(10);
                pipe.Flush();
            } finally {
                if (ciphertext != null) Array.Clear(ciphertext, 0, ciphertext.Length);
                if (plaintext != null) Array.Clear(plaintext, 0, plaintext.Length);
                if (utf8 != null) Array.Clear(utf8, 0, utf8.Length);
                if (chars != null) Array.Clear(chars, 0, chars.Length);
            }
        }
        public static void Remove(string root) { File.Delete(KeyPath(root)); }
    }
}
'@
}

