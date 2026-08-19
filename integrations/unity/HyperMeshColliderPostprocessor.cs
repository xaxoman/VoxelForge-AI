// HyperMesh 3D Studio — automatic collider generation for Unity.
//
// Godot's glTF importer reads collision suffixes on node names natively.
// Unity has no equivalent convention, so this AssetPostprocessor reproduces the
// behaviour: any imported model whose child objects carry these suffixes gets
// real colliders without a single manual step.
//
//   Name              Result in Unity                       Visual
//   ----------------  ------------------------------------  ---------
//   Foo-convcolonly   convex MeshCollider                   removed
//   Foo-colonly       concave (non-convex) MeshCollider     removed
//   Foo-convcol       convex MeshCollider                   kept
//   Foo-col           concave (non-convex) MeshCollider     kept
//
// The suffix is stripped from the object name afterwards, so the hierarchy
// reads the same in both engines.
//
// INSTALL: drop this file anywhere under an `Editor` folder in your project,
// for example  Assets/Editor/HyperMeshColliderPostprocessor.cs
// It then runs automatically whenever a model is imported or reimported.
//
// NOTE: Unity's convex MeshCollider is capped at 255 triangles and will
// silently simplify anything larger. HyperMesh's hulls stay well under that.

using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

public class HyperMeshColliderPostprocessor : AssetPostprocessor
{
    /// <summary>Suffix -> (convex collider, keep the renderer).</summary>
    /// <remarks>
    /// Order matters. "-convcolonly" must be tested before "-colonly", and
    /// "-convcol" before "-col", or the shorter suffix would match first and
    /// pick the wrong shape type.
    /// </remarks>
    private static readonly (string Suffix, bool Convex, bool KeepVisual)[] Rules =
    {
        ("-convcolonly", true,  false),
        ("-colonly",     false, false),
        ("-convcol",     true,  true),
        ("-col",         false, true),
    };

    private void OnPostprocessModel(GameObject root)
    {
        // Materialise the list first: the loop reparents and destroys objects,
        // which would invalidate a live hierarchy walk.
        var candidates = new List<Transform>(root.GetComponentsInChildren<Transform>(true));
        var colliderCount = 0;

        foreach (var transform in candidates)
        {
            if (transform == null) continue;

            var go = transform.gameObject;
            var rule = MatchRule(go.name);
            if (rule == null) continue;

            if (ApplyRule(go, rule.Value))
            {
                colliderCount++;
            }
        }

        if (colliderCount > 0)
        {
            Debug.Log(
                $"[HyperMesh] Generated {colliderCount} collider(s) for '{root.name}' " +
                "from Godot-style name suffixes.");
        }
    }

    private static (string Suffix, bool Convex, bool KeepVisual)? MatchRule(string name)
    {
        foreach (var rule in Rules)
        {
            if (name.EndsWith(rule.Suffix, System.StringComparison.OrdinalIgnoreCase))
            {
                return rule;
            }
        }

        return null;
    }

    /// <returns>True if a collider was actually added.</returns>
    private static bool ApplyRule(GameObject go, (string Suffix, bool Convex, bool KeepVisual) rule)
    {
        var meshFilter = go.GetComponent<MeshFilter>();
        var mesh = meshFilter != null ? meshFilter.sharedMesh : null;

        if (mesh == null)
        {
            Debug.LogWarning(
                $"[HyperMesh] '{go.name}' carries a collision suffix but has no mesh; skipping.");
            return false;
        }

        var collider = go.GetComponent<MeshCollider>();
        if (collider == null)
        {
            collider = go.AddComponent<MeshCollider>();
        }

        collider.sharedMesh = mesh;
        collider.convex = rule.Convex;

        if (!rule.KeepVisual)
        {
            // Strip the visual but keep MeshFilter — MeshCollider reads its mesh
            // from the shared mesh reference, and removing the filter here would
            // leave the collider without geometry.
            var renderer = go.GetComponent<MeshRenderer>();
            if (renderer != null)
            {
                UnityEngine.Object.DestroyImmediate(renderer);
            }
        }

        // Match Godot, which also drops the suffix from the resulting node name.
        go.name = go.name.Substring(0, go.name.Length - rule.Suffix.Length);
        return true;
    }
}
