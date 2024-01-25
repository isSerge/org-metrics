import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { updateContributorsData } from '../../aggregate';

it('updateContributorsData should handle an empty array of pull requests', () => {
  const locations = new Map();
  const uniqueParticipants = new Map();
  const [updatedLocations, updatedUniqueParticipants] = updateContributorsData(
    [],
    locations,
    uniqueParticipants
  );

  assert.equal(updatedLocations.size, 0);
  assert.equal(updatedUniqueParticipants.size, 0);
});
