RSpec.describe NewFlowBranchGenerator do
  subject(:generator) { described_class.new }
  let(:latest_metadata) { metadata_fixture('branching') }
  let(:valid) { true }

  context 'creating a new branching object' do
    context 'in the middle of a flow' do
      it 'creates valid flow branch object metadata' do
        expect(
          MetadataPresenter::ValidateSchema.validate(
            generator.to_metadata, 'flow.base'
          )
        ).to be(valid)
      end
    end
  end
end
